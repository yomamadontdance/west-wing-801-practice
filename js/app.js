import {
  createGame,
  startHand,
  applyAction,
  getLegalActions,
  coachText,
  streetLabel,
  livingPlayers,
  needsRunout,
  revealedCount,
  flipThree,
  startBettingRound,
  resolveShowdown,
  finishUncontested,
  shouldConfirmFold,
  snapBetAmount,
  defaultSliderTo,
  formatCards,
  RANK_CHARS,
  SUIT_GLYPHS,
} from "./engine.js";
import { chooseBotAction } from "./bots.js";
import { AVATARS, avatarSvg, avatarLabel, avatarHTML } from "./avatars.js";
const myAvatar = () => localStorage.getItem("video.avatar") || "";
const botAvatar = (seat) => AVATARS[(seat * 5 + 3) % AVATARS.length].id;
function renderSoloAvatarBtn() {
  const b = document.getElementById("btn-avatar"); if (!b) return;
  const v = myAvatar();
  b.innerHTML = `${avatarHTML(v, "You", 28)}<span>${v.startsWith("data:") ? "Your picture" : avatarLabel(v)} · change</span>`;
}
document.addEventListener("click", (e) => {
  const sh = document.getElementById("avatar-sheet");
  if (e.target.closest("#btn-avatar")) {
    const cur = myAvatar();
    document.getElementById("avatar-grid").innerHTML = [`<button type="button" class="av-opt${cur ? "" : " on"}" data-av="">${avatarSvg("", "You", 48)}<span>Initials</span></button>`]
      .concat(AVATARS.map((a) => `<button type="button" class="av-opt${a.id === cur ? " on" : ""}" data-av="${a.id}">${avatarSvg(a.id, "", 48)}<span>${a.label}</span></button>`)).join("");
    sh.classList.remove("hidden"); return;
  }
  const o = e.target.closest("[data-av]");
  if (o) { localStorage.setItem("video.avatar", o.dataset.av); sh.classList.add("hidden"); renderSoloAvatarBtn(); return; }
  if (e.target.id === "avatar-sheet" || e.target.id === "avatar-close") sh?.classList.add("hidden");
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "av-file") return;
  try { localStorage.setItem("video.avatar", await pictureToAvatar(e.target.files?.[0])); document.getElementById("avatar-sheet").classList.add("hidden"); renderSoloAvatarBtn(); }
  catch (err) { alert(err.message || "Could not use that picture."); }
});
setTimeout(renderSoloAvatarBtn, 0);

const HOWTO_KEY = "video.howto.v1";
const HOWTO = [
  {
    title: "Your 6 hole cards",
    body: "You get six private cards. Bots get six too (hidden). At showdown the game uses exactly 2 of your 6 — you don’t pick. That’s Omaha, not Hold’em.",
  },
  {
    title: "The 3×3 board",
    body: "Nine community cards sit in a tic-tac-toe grid, all face down at first. Each betting street, three random cells flip (not necessarily a row). Your hand uses exactly 3 of those 9 board cards.",
  },
  {
    title: "High half, low half",
    body: "High hand (normal poker ranks) wins half the pot. A qualifying low — 8 or better, unpaired, Ace counts low — wins the other half. Win both = scoop. Two-way tie on one side = a quarter each. Three-way = a sixth. No low? High takes everything. Odd chip to high.",
  },
];

const SEAT_POS = {
  /* Portrait oval (table rotated 90°). Seats on the rail, cards toward center. */
  5: [
    { x: 50, y: 90, rot: 0 },
    { x: 10, y: 62, rot: 72 },
    { x: 18, y: 14, rot: 148 },
    { x: 82, y: 14, rot: 212 },
    { x: 90, y: 62, rot: 288 },
  ],
  6: [
    { x: 50, y: 90, rot: 0 },
    { x: 9, y: 66, rot: 58 },
    { x: 12, y: 28, rot: 118 },
    { x: 50, y: 9, rot: 180 },
    { x: 88, y: 28, rot: 242 },
    { x: 91, y: 66, rot: 302 },
  ],
  7: [
    { x: 50, y: 90, rot: 0 },
    { x: 10, y: 70, rot: 48 },
    { x: 9, y: 42, rot: 92 },
    { x: 22, y: 12, rot: 150 },
    { x: 78, y: 12, rot: 210 },
    { x: 91, y: 42, rot: 268 },
    { x: 90, y: 70, rot: 312 },
  ],
};

const $ = (id) => document.getElementById(id);
let seatCount = 6;
let game = null;
let howtoPage = 0;
let foldArmed = false;
let sliderTo = 0;
let busy = false;
let botTimer = null;
let dealVisible = { holes: 0, board: 0, blinds: false };
let ticker = "";
let showdownOpen = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cardEl(card, { back = false, mini = false, flip = false } = {}) {
  const cls = ["card", mini ? "mini" : "", back ? "back" : "", flip ? "flip-in" : ""]
    .filter(Boolean)
    .join(" ");
  if (back || !card) return `<div class="${cls}"></div>`;
  const red = card.suit === 1 || card.suit === 2;
  return `<div class="${cls} ${red ? "red" : "black"}"><span class="r">${RANK_CHARS[card.rank]}</span><span class="s">${SUIT_GLYPHS[card.suit]}</span></div>`;
}

function show(id) {
  $("setup").classList.toggle("hidden", id !== "setup");
  $("howto").classList.toggle("hidden", id !== "howto");
  $("play").classList.toggle("hidden", id !== "play");
}

function renderHowTo() {
  const s = HOWTO[howtoPage];
  $("howto-title").textContent = s.title;
  $("howto-body").textContent = s.body;
  [...$("howto-dots").children].forEach((d, i) => d.classList.toggle("on", i === howtoPage));
  $("howto-next").textContent = howtoPage === HOWTO.length - 1 ? "Let’s play" : "Next";
}

function maybeHowToThenPlay() {
  if (localStorage.getItem(HOWTO_KEY) === "1") {
    beginTable();
    return;
  }
  howtoPage = 0;
  renderHowTo();
  show("howto");
}

function beginTable() {
  game = createGame({ seatCount });
  show("play");
  $("showdown").classList.add("hidden");
  showdownOpen = false;
  runHand();
}

async function runHand() {
  clearTimeout(botTimer);
  busy = true;
  foldArmed = false;
  startHand(game);
  dealVisible = { holes: 0, board: 0, blinds: false };
  ticker = "Dealing…";
  $("coach").textContent = ""; $("coach").classList.add("hidden");
  render(true);
  const n = game.players.length;
  for (let lap = 0; lap < 6; lap++) {
    dealVisible.holes = lap + 1;
    render(true);
    await sleep(70);
  }
  dealVisible.board = 9;
  render(true);
  await sleep(220);
  dealVisible.blinds = true;
  ticker = `Blinds posted: SB ${game.sb}, BB ${game.bb}.`;
  render(true);
  await sleep(280);
  busy = false;
  render();
  kick();
}

function kick() {
  if (busy || !game) return;
  if (game.phase === "uncontested") {
    finishUncontested(game);
    openShowdown();
    return;
  }
  if (game.phase === "roundComplete") {
    afterRound();
    return;
  }
  if (game.phase === "showdown") {
    openShowdown();
    return;
  }
  if (game.phase === "straddle" || game.phase === "betting") {
    const p = game.players[game.toAct];
    if (!p) return;
    if (p.isHuman) {
      render();
      return;
    }
    clearTimeout(botTimer);
    const wait = 420 + Math.floor(Math.random() * 280);
    ticker = `Waiting for ${p.name}…`;
    render();
    botTimer = setTimeout(() => {
      botGo();
    }, wait);
  }
}

function botGo() {
  if (!game || busy) return;
  const p = game.players[game.toAct];
  if (!p || p.isHuman) return;
  let action = chooseBotAction(game);
  let r = applyAction(game, action);
  if (!r.ok) {
    const L = getLegalActions(game);
    if (L.canSkipStraddle) action = { type: "skipStraddle" };
    else if (L.canCheck) action = { type: "check" };
    else if (L.canCall) action = { type: "call" };
    else if (L.canFold) action = { type: "fold" };
    else action = { type: "allin" };
    r = applyAction(game, action);
  }
  ticker = describeAction(p, action);
  render();
  kick();
}

function describeAction(p, action) {
  switch (action.type) {
    case "fold":
      return `${p.name} folds.`;
    case "check":
      return `${p.name} checks.`;
    case "call":
      return `${p.name} calls.`;
    case "bet":
      return `${p.name} bets ${action.to}.`;
    case "raise":
      return `${p.name} raises to ${action.to}.`;
    case "allin":
      return `${p.name} is all-in.`;
    case "straddle":
      return `${p.name} straddles 100.`;
    case "skipStraddle":
      return `${p.name} declines the straddle.`;
    default:
      return `${p.name} acts.`;
  }
}

async function afterRound() {
  busy = true;
  const live = livingPlayers(game);
  if (live.length === 1) {
    finishUncontested(game);
    busy = false;
    openShowdown();
    return;
  }
  const up = revealedCount(game);
  const runout = needsRunout(game);
  if (up < 9) {
    const flipped = flipThree(game);
    ticker = runout ? "All-in — running out the board." : "Flipping 3 cells.";
    render(true);
    await sleep(520);
    if (runout) {
      while (revealedCount(game) < 9) {
        flipThree(game);
        render(true);
        await sleep(420);
      }
      resolveShowdown(game);
      busy = false;
      openShowdown();
      return;
    }
    game.streetIndex = revealedCount(game) / 3;
    startBettingRound(game);
    busy = false;
    render();
    kick();
    return;
  }
  resolveShowdown(game);
  busy = false;
  openShowdown();
}

function openShowdown() {
  showdownOpen = true;
  render();
  $("showdown-text").textContent = game.narration || "";
  const parts = [];
  if (game.showdownEvals) {
    for (const p of game.players) {
      if (p.folded) continue;
      const ev = game.showdownEvals[p.seat];
      if (!ev) continue;
      const hi = ev.high ? `high ${formatCards(ev.high.five)} (${ev.high.name})` : "";
      const lo = ev.low ? `low ${formatCards(ev.low.five)} (${ev.low.name})` : "no low";
      parts.push(`${p.name}: ${hi}; ${lo}.`);
    }
  }
  $("showdown-hands").textContent = parts.join(" ");
  $("showdown").classList.remove("hidden");
}

function humanAct(action) {
  if (busy || !game) return;
  const p = game.players[game.toAct];
  if (!p || !p.isHuman) return;
  const r = applyAction(game, action);
  if (!r.ok) {
    ticker = r.error || "That isn’t legal.";
    foldArmed = false;
    render();
    return;
  }
  ticker = describeAction(p, action);
  foldArmed = false;
  render();
  kick();
}

function render(dealing = false) {
  if (!game) return;
  $("pot-chip").textContent = `Pot ${game.pot}`;
  $("coach").textContent = ""; $("coach").classList.add("hidden");
  $("ticker").textContent = ticker;
  renderFelt(dealing);
  renderHole();
  renderActions(dealing);
}

function renderFelt(dealing) {
  const n = game.players.length;
  const pos = SEAT_POS[n];
  const up = revealedCount(game);
  const boardLbl = "";
  const seats = game.players
    .map((p, i) => {
      const land = window.matchMedia("(orientation: landscape) and (max-height: 560px)").matches;
      const th = Math.PI + (i * 2 * Math.PI) / n;
      const { x, y, rot } = land ? { x: 50 + 46 * Math.sin(th), y: 55 - 34 * Math.cos(th), rot: Math.round(((th * 180) / Math.PI + 180) % 360) } : pos[i];
      const badges = [];
      if (p.seat === game.button) badges.push("D");
      if (p.seat === game.sbSeat) badges.push("SB");
      if (p.seat === game.bbSeat) badges.push("BB");
      if (game.straddleSeat === p.seat) badges.push("STR");
      const show = (game.phase === "showdown" && !p.folded) || p.isHuman;
      const nShow = dealing ? Math.min(dealVisible.holes, 6) : 6;
      let minis = "";
      if (!p.isHuman) for (let k = 0; k < nShow; k++) {
        if (show) minis += cardEl(p.hole[k], { mini: true });
        else minis += cardEl(null, { back: true, mini: true });
      }
      const cls = [
        "seat",
        p.isHuman ? "human" : "",
        p.folded ? "folded" : "",
        game.toAct === p.seat && !dealing ? "to-act" : "",
      ].join(" ");
      const name = p.isHuman ? "You" : p.name;
      // human hole cards rendered as .hero-hand on the felt
      const fan = p.isHuman
        ? "transform:translate(-50%,-50%) translateY(-56px)"
        : `transform:translate(-50%,-50%) rotate(${rot}deg) translateY(-44px)`;
      return `<div class="${cls}" style="left:${x}%;top:${y}%;--rot:${rot}deg">
        <div class="seat-chip">
          <div class="name">${avatarHTML(p.isHuman ? myAvatar() : botAvatar(p.seat), p.isHuman ? "You" : p.name, 16)}${name}</div>
          <div class="stack">${p.stack}</div>
          <div class="badges">${badges.map((b) => `<span class="badge">${b}</span>`).join("")}</div>
        </div>
        <div class="seat-cards" style="${fan}">${minis}</div>
      </div>`;
    })
    .join("");

  const cells = [];
  for (let i = 0; i < 9; i++) {
    const dealt = !dealing || i < dealVisible.board;
    const face = dealt && game.revealed[i];
    const just = game.lastFlip && game.lastFlip.includes(i);
    if (!dealt) cells.push(`<div class="card" style="visibility:hidden"></div>`);
    else if (face) cells.push(cardEl(game.board[i], { flip: just }));
    else cells.push(cardEl(null, { back: true }));
  }
  const humanBadges = [];
  const hp = game.players[0];
  if (hp.seat === game.button) humanBadges.push("D");
  if (hp.seat === game.sbSeat) humanBadges.push("SB");
  if (hp.seat === game.bbSeat) humanBadges.push("BB");
  if (game.straddleSeat === 0) humanBadges.push("STR");

  const me = game.players.find((p) => p.isHuman);
  const hero = me?.hole?.length ? `<div class="hero-hand" style="--n:${me.hole.length}"><div class="hero-cards">${me.hole.map((c,k)=>{const mid=(me.hole.length-1)/2;const rot=(k-mid)*(me.hole.length>4?4:5);return `<div class="hand-card" style="--rot:${rot}deg;z-index:${k+1}">${cardEl(c)}</div>`;}).join("")}</div></div>` : "";
  $("felt").innerHTML = `
    ${seats}
    ${hero}
    <div class="board-block">
      <div class="grid">${cells.join("")}</div>
    </div>`;
}

function renderHole() {
  /* Human hole cards sit in front of the south seat on the table. */
}

function renderActions(dealing) {
  const bar = $("actions");
  const hint = $("fold-hint");
  hint.classList.add("hidden");
  bar.classList.remove("human-turn");
  if (dealing || busy || showdownOpen || !game) {
    bar.innerHTML = "";
    return;
  }
  const p = game.players[game.toAct];
  if (!p || !p.isHuman) {
    bar.innerHTML = `<div class="btn-row"><button type="button" disabled>Waiting…</button></div>`;
    return;
  }
  bar.classList.add("human-turn");
  const L = getLegalActions(game);
  if (L.canStraddle) {
    bar.innerHTML = `
      <div class="btn-row">
        <button type="button" class="btn-skip" id="btn-skip">Don't straddle</button>
        <button type="button" class="btn-bet" id="btn-straddle">Straddle ¥${game.straddle || 100}</button>
      </div>
      <div class="max-hint">Optional live extra blind. Skip if you're unsure.</div>`;
    $("btn-skip").onclick = () => humanAct({ type: "skipStraddle" });
    $("btn-straddle").onclick = () => humanAct({ type: "straddle" });
    return;
  }

  const bits = [];
  if (L.canFold) {
    bits.push(
      `<button type="button" class="btn-fold${foldArmed ? " armed" : ""}" id="btn-fold">${foldArmed ? "Tap to fold" : "Fold"}</button>`
    );
  }
  if (L.canCheck) {
    bits.push(`<button type="button" class="btn-call" id="btn-check">Check</button>`);
  } else if (L.canCall) {
    bits.push(`<button type="button" class="btn-call" id="btn-call">Call ${L.callAmount}</button>`);
  }
  const betOk = L.canBet || L.canRaise;
  if (betOk) {
    const min = L.minTo;
    const max = L.maxTo;
    if (!sliderTo || sliderTo < min || sliderTo > max) sliderTo = defaultSliderTo(L);
    sliderTo = snapBetAmount(sliderTo, min, max, 10);
    const label = L.canBet ? `Bet ${sliderTo}` : `Raise to ${sliderTo}`;
    bits.push(`<button type="button" class="btn-bet" id="btn-bet">${label}</button>`);
  }
  let html = `<div class="btn-row">${bits.join("")}</div>`;
  if (betOk) {
    html += `
      <div class="slider-wrap">
        <label>Min ${L.minTo}</label>
        <input type="range" id="bet-range" min="${L.minTo}" max="${L.maxTo}" step="1" value="${sliderTo}">
        <label>Max ${L.maxTo}</label>
      </div>
      <div class="max-hint">Pot-limit: you cannot bet more than ${L.maxTo}.</div>`;
  }
  if (L.canAllIn) {
    html += `<div class="btn-row"><button type="button" class="btn-allin" id="btn-allin">All-in ${L.allInTo}</button></div>`;
  }
  bar.innerHTML = html;
  if (foldArmed) hint.classList.remove("hidden");

  const range = $("bet-range");
  if (range) {
    range.addEventListener("input", () => {
      sliderTo = snapBetAmount(range.value, L.minTo, L.maxTo, 10);
      range.value = sliderTo;
      const b = $("btn-bet");
      if (b) b.textContent = L.canBet ? `Bet ${sliderTo}` : `Raise to ${sliderTo}`;
    });
  }
  const allin = $("btn-allin");
  if (allin) allin.onclick = () => humanAct({ type: "allin" });
  const foldBtn = $("btn-fold");
  if (foldBtn) {
    foldBtn.onclick = () => {
      if (shouldConfirmFold(game, 0) && !foldArmed) {
        foldArmed = true;
        render();
        return;
      }
      humanAct({ type: "fold" });
    };
  }
  const chk = $("btn-check");
  if (chk) chk.onclick = () => humanAct({ type: "check" });
  const cl = $("btn-call");
  if (cl) cl.onclick = () => humanAct({ type: "call" });
  const bt = $("btn-bet");
  if (bt) {
    bt.onclick = () => humanAct({ type: L.canBet ? "bet" : "raise", to: sliderTo });
  }
}

$("seat-picks").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-seats]");
  if (!b) return;
  const n = Number(b.dataset.seats);
  if (n < 5 || n > 7) return;
  seatCount = n;
  $("seat-picks").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
});

$("howto-open").onclick = () => {
  howtoPage = 0;
  renderHowTo();
  show("howto");
};

$("sit").onclick = () => {
  if (seatCount < 5 || seatCount > 7) seatCount = 6;
  maybeHowToThenPlay();
};

$("howto-skip").onclick = () => {
  localStorage.setItem(HOWTO_KEY, "1");
  beginTable();
};
$("howto-next").onclick = () => {
  if (howtoPage < HOWTO.length - 1) {
    howtoPage++;
    renderHowTo();
  } else {
    localStorage.setItem(HOWTO_KEY, "1");
    beginTable();
  }
};

$("next-hand").onclick = () => {
  $("showdown").classList.add("hidden");
  showdownOpen = false;
  runHand();
};
$("change-table").onclick = () => {
  clearTimeout(botTimer);
  $("showdown").classList.add("hidden");
  showdownOpen = false;
  game = null;
  show("setup");
};

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

show("setup");
