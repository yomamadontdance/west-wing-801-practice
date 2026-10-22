/**
 * VIDEO — 6-card Omaha high-low on a 3×3 board.
 * Pure logic: Node tests and the browser both import this file.
 */
/** Default stake level: 25/50 RMB play chips (not real money). */
export const SB = 25;
export const BB = 50;
export const STRADDLE = 100; // one live UTG straddle = 2×BB
/** @deprecated solo default only — multiplayer uses bankroll (CREDIT_START / TABLE_MIN). */
export const START_STACK = 5000;
export const RANK_CHARS = "23456789TJQKA";
export const SUIT_CHARS = "cdhs";
export const SUIT_GLYPHS = ["♣", "♦", "♥", "♠"];
export const STREET_IDS = ["pre", "flip1", "flip2", "flip3"];

export function parseCard(code) {
  const r = RANK_CHARS.indexOf(code[0]);
  const s = SUIT_CHARS.indexOf(code[1]);
  if (r < 0 || s < 0 || code.length !== 2) throw new Error("Bad card: " + code);
  return { rank: r, suit: s, code };
}

export function parseCards(str) {
  return str.trim().split(/\s+/).filter(Boolean).map(parseCard);
}

export function formatCard(c, glyphs = true) {
  const r = RANK_CHARS[c.rank];
  return glyphs ? r + SUIT_GLYPHS[c.suit] : c.code;
}

export function formatCards(cards, glyphs = true) {
  return cards.map((c) => formatCard(c, glyphs)).join(" ");
}

export function createDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 0; r < 13; r++) {
      d.push({ rank: r, suit: s, code: RANK_CHARS[r] + SUIT_CHARS[s] });
    }
  }
  return d;
}

/**
 * Cryptographically secure [0, 1) float for dealing/shuffling.
 * Uses crypto.getRandomValues in the browser (and Node 19+), else node:crypto.randomBytes.
 * Never use Math.random for cards — it is predictable.
 */
export function cryptoRandom() {
  const g = globalThis.crypto;
  if (g && typeof g.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    g.getRandomValues(buf);
    return buf[0] / 4294967296; // [0, 1)
  }
  // Node without global crypto.getRandomValues (rare): use the Web Crypto polyfill Node provides on globalThis
  throw new Error("crypto.getRandomValues unavailable — cannot deal fairly");
}

/** Fisher–Yates. Default rng is cryptoRandom — pass a seed fn only in tests. */
export function shuffle(deck, rng = cryptoRandom) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function combinations(arr, k) {
  const n = arr.length;
  const out = [];
  if (k < 0 || k > n) return out;
  if (k === 0) return [[]];
  const idx = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    out.push(idx.map((i) => arr[i]));
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

function highVal(rank) {
  return rank === 12 ? 14 : rank + 2;
}

function rankName(v) {
  return { 14: "ace", 13: "king", 12: "queen", 11: "jack", 10: "ten" }[v] || String(v);
}

function rankNamePlural(v) {
  return { 14: "aces", 13: "kings", 12: "queens", 11: "jacks", 10: "tens" }[v] || rankName(v) + "s";
}

/** 5-card high hand. Ace high, A-5 wheel counts as a five-high straight. */
export function evalHigh5(cards) {
  if (cards.length !== 5) throw new Error("evalHigh5 needs 5 cards");
  const ranks = cards.map((c) => highVal(c.rank)).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
  const groups = [...counts.entries()]
    .map(([r, n]) => ({ r, n }))
    .sort((a, b) => b.n - a.n || b.r - a.r);
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) {
      isStraight = true;
      straightHigh = uniq[0];
    } else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }
  const kick = (extra) => extra;
  let cat, kickers, name;
  if (isStraight && isFlush) {
    cat = 8;
    kickers = [straightHigh];
    name = straightHigh === 14 ? "royal flush" : `straight flush, ${rankName(straightHigh)} high`;
  } else if (groups[0].n === 4) {
    cat = 7;
    kickers = [groups[0].r, groups[1].r];
    name = `four ${rankNamePlural(groups[0].r)}`;
  } else if (groups[0].n === 3 && groups[1] && groups[1].n === 2) {
    cat = 6;
    kickers = [groups[0].r, groups[1].r];
    name = `full house, ${rankNamePlural(groups[0].r)} over ${rankNamePlural(groups[1].r)}`;
  } else if (isFlush) {
    cat = 5;
    kickers = ranks;
    name = `flush, ${rankName(ranks[0])} high`;
  } else if (isStraight) {
    cat = 4;
    kickers = [straightHigh];
    name = straightHigh === 5 ? "the wheel (A-2-3-4-5 straight)" : `straight, ${rankName(straightHigh)} high`;
  } else if (groups[0].n === 3) {
    cat = 3;
    const rest = groups.slice(1).map((g) => g.r).sort((a, b) => b - a);
    kickers = [groups[0].r, ...rest];
    name = `three ${rankNamePlural(groups[0].r)}`;
  } else if (groups[0].n === 2 && groups[1] && groups[1].n === 2) {
    cat = 2;
    const p1 = Math.max(groups[0].r, groups[1].r);
    const p2 = Math.min(groups[0].r, groups[1].r);
    const kicker = groups[2].r;
    kickers = [p1, p2, kicker];
    name = `two pair, ${rankNamePlural(p1)} and ${rankNamePlural(p2)}`;
  } else if (groups[0].n === 2) {
    cat = 1;
    const rest = groups.slice(1).map((g) => g.r).sort((a, b) => b - a);
    kickers = [groups[0].r, ...rest];
    name = `a pair of ${rankNamePlural(groups[0].r)}`;
  } else {
    cat = 0;
    kickers = ranks;
    name = `${rankName(ranks[0])}-high`;
  }
  return { cat, kickers, name, cards: cards.slice() };
}

export function compareHigh(a, b) {
  if (a.cat !== b.cat) return a.cat - b.cat;
  const n = Math.max(a.kickers.length, b.kickers.length);
  for (let i = 0; i < n; i++) {
    const av = a.kickers[i] || 0;
    const bv = b.kickers[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * 8-or-better low: five unpaired ranks from A,2,3,4,5,6,7,8.
 * Ace is low. Straights and flushes do not hurt. Null if no qualifier.
 * Lower vals (compared high-card first) is better. Wheel is 5-4-3-2-A.
 */
export function evalLow5(cards) {
  if (cards.length !== 5) throw new Error("evalLow5 needs 5 cards");
  const vals = [];
  const seen = new Set();
  for (const c of cards) {
    const v = c.rank === 12 ? 1 : c.rank + 2;
    if (v > 8) return null;
    if (seen.has(v)) return null;
    seen.add(v);
    vals.push(v);
  }
  vals.sort((a, b) => b - a);
  const glyph = (v) => (v === 1 ? "A" : String(v));
  const isWheel = vals[0] === 5 && vals[4] === 1;
  const name = isWheel
    ? "the nut low (A-2-3-4-5)"
    : vals.map(glyph).join("-");
  return { vals, name, cards: cards.slice(), isWheel };
}

export function compareLow(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  for (let i = 0; i < 5; i++) {
    if (a.vals[i] !== b.vals[i]) return a.vals[i] - b.vals[i];
  }
  return 0;
}

function bestCombo(hole, board, evalFive, compare, wantLow) {
  if (!hole || hole.length < 2 || !board || board.length < 3) return null;
  let best = null;
  for (const h2 of combinations(hole, 2)) {
    for (const b3 of combinations(board, 3)) {
      const five = [...h2, ...b3];
      const ev = evalFive(five);
      if (!ev) continue;
      if (!best) {
        best = { ...ev, hole2: h2, board3: b3, five };
        continue;
      }
      const cmp = compare(ev, best);
      const better = wantLow ? cmp < 0 : cmp > 0;
      if (better) best = { ...ev, hole2: h2, board3: b3, five };
    }
  }
  return best;
}

export function bestOmahaHigh(hole, board) {
  return bestCombo(hole, board, evalHigh5, compareHigh, false);
}

export function bestOmahaLow(hole, board) {
  return bestCombo(hole, board, evalLow5, compareLow, true);
}

/**
 * Pot-limit: after calling, you may raise up to the size of the pot.
 * Returns the maximum total this street (raise-to / bet-to), capped by stack.
 */
export function potLimitMaxTo({ pot, currentBet, betThisStreet, stack }) {
  const toCall = Math.max(0, currentBet - betThisStreet);
  const affordableCall = Math.min(toCall, stack);
  const potAfterCall = pot + affordableCall;
  const maxTo =
    currentBet === 0 ? potAfterCall : currentBet + potAfterCall;
  return Math.min(betThisStreet + stack, maxTo);
}

export function potLimitMinTo({ currentBet, lastRaiseSize, betThisStreet, stack, bb = BB }) {
  if (currentBet === 0) return Math.min(betThisStreet + stack, bb);
  return currentBet + lastRaiseSize;
}

export function leftOf(seat, n) {
  return (seat + 1) % n;
}

function playerBySeat(game, seat) {
  return game.players[seat];
}

export function nextCanAct(game, fromSeat) {
  const n = game.players.length;
  for (let i = 1; i <= n; i++) {
    const p = game.players[(fromSeat + i) % n];
    if (!p.folded && !p.allIn) return p.seat;
  }
  return null;
}

export function livingPlayers(game) {
  return game.players.filter((p) => !p.folded);
}

export function actors(game) {
  return game.players.filter((p) => !p.folded && !p.allIn);
}

export function revealedBoard(game) {
  return game.board.filter((_, i) => game.revealed[i]);
}

export function revealedCount(game) {
  return game.revealed.filter(Boolean).length;
}

export function hasMadeHand(game) {
  return revealedCount(game) >= 3;
}

export function streetLabel(game) {
  const n = revealedCount(game);
  if (game.lastFlip && game.lastFlip.length && n < 9) {
    if (n === 3) return "3 just flipped — 6 still hidden";
    if (n === 6) return "3 more just flipped — 3 still hidden";
  }
  if (n === 0) return "board — still hidden";
  if (n === 3) return "3 of 9 up";
  if (n === 6) return "6 of 9 up";
  if (n === 9) return "all 9 are up";
  return `${n} of 9 up`;
}

export function streetCoach(game) {
  const n = revealedCount(game);
  if (n === 0) return "Pre-turn — all 9 board cards still hidden.";
  if (n === 3) return "First 3 flipped.";
  if (n === 6) return "6 of 9 up.";
  return "All 9 are up.";
}

function putChips(game, player, amount) {
  const a = Math.max(0, Math.min(Math.floor(amount), player.stack));
  player.stack -= a;
  player.betThisStreet += a;
  player.committed += a;
  game.pot += a;
  if (player.stack === 0) player.allIn = true;
  return a;
}

function resetActed(game, exceptSeat) {
  for (const p of game.players) {
    p.acted = p.folded || p.allIn || p.seat === exceptSeat;
  }
}

export function isRoundComplete(game) {
  if (game.phase !== "betting") return false;
  const live = livingPlayers(game);
  if (live.length <= 1) return true;
  const need = actors(game);
  if (need.length === 0) return true;
  for (const p of need) {
    if (!p.acted) return false;
    if (p.betThisStreet !== game.currentBet) return false;
  }
  return true;
}

export function getLegalActions(game, seat = game.toAct) {
  const empty = {
    canFold: false,
    canCheck: false,
    canCall: false,
    callAmount: 0,
    canBet: false,
    canRaise: false,
    canAllIn: false,
    canStraddle: false,
    canSkipStraddle: false,
    minTo: 0,
    maxTo: 0,
    allInTo: 0,
    toCall: 0,
  };
  if (seat == null || !game.players[seat]) return empty;
  const p = game.players[seat];
  if (game.phase === "straddle") {
    const utg = leftOf(game.bbSeat, game.players.length);
    if (seat === utg && p.stack >= game.straddle && !p.folded) {
      return { ...empty, canStraddle: true, canSkipStraddle: true };
    }
    return empty;
  }
  if (game.phase !== "betting" || p.folded || p.allIn) return empty;
  const toCall = Math.max(0, game.currentBet - p.betThisStreet);
  const maxTo = potLimitMaxTo({
    pot: game.pot,
    currentBet: game.currentBet,
    betThisStreet: p.betThisStreet,
    stack: p.stack,
  });
  const minToRaw = potLimitMinTo({
    currentBet: game.currentBet,
    lastRaiseSize: game.lastRaiseSize,
    betThisStreet: p.betThisStreet,
    stack: p.stack,
    bb: game.bb,
  });
  const allInTo = p.betThisStreet + p.stack;
  const L = { ...empty, toCall, maxTo, allInTo, minTo: minToRaw };
  L.canFold = true;
  if (toCall === 0) {
    L.canCheck = true;
    if (p.stack > 0 && maxTo > p.betThisStreet) {
      L.canBet = true;
      L.minTo = Math.min(maxTo, Math.max(game.bb, p.betThisStreet + (p.stack > 0 ? 1 : 0)));
      if (p.stack + p.betThisStreet < game.bb) L.minTo = allInTo;
      L.minTo = Math.min(L.minTo, maxTo);
    }
  } else {
    if (p.stack > toCall) {
      L.canCall = true;
      L.callAmount = toCall;
    } else if (p.stack > 0) {
      L.canCall = false;
      L.callAmount = p.stack;
    }
  }
  const canPutMore = p.stack > toCall;
  const raiseToCap = maxTo;
  const minRaiseTo = minToRaw;
  if (canPutMore && raiseToCap > game.currentBet) {
    if (allInTo >= minRaiseTo || allInTo === maxTo || allInTo > game.currentBet) {
      if (raiseToCap >= minRaiseTo) {
        L.canRaise = game.currentBet > 0;
        L.minTo = Math.min(minRaiseTo, raiseToCap);
        L.maxTo = raiseToCap;
      } else if (allInTo > game.currentBet) {
        // Short all-in raise only — no slider raise
        L.canRaise = false;
        L.maxTo = raiseToCap;
      }
    }
  }
  if (toCall === 0 && L.canBet) {
    L.canRaise = false;
  }
  // True all-in only if the player's stack is within the legal cap.
  if (p.stack > 0) {
    if (allInTo <= maxTo + 1e-9) L.canAllIn = true;
    else L.canAllIn = false; // would exceed pot-limit; use Max on the slider
  }
  if (toCall > 0 && p.stack <= toCall && p.stack > 0) {
    L.canAllIn = true;
    L.canCall = false;
    L.callAmount = p.stack;
  }
  return L;
}

function assertLegal(game, action) {
  const L = getLegalActions(game, game.toAct);
  const t = action.type;
  if (t === "straddle" && !L.canStraddle) return "Straddle is not available.";
  if (t === "skipStraddle" && !L.canSkipStraddle) return "Not a straddle decision.";
  if (t === "fold" && !L.canFold) return "You cannot fold now.";
  if (t === "check" && !L.canCheck) return "You cannot check — there is a bet.";
  if (t === "call" && !L.canCall) return "You cannot call now.";
  if (t === "bet" && !L.canBet) return "You cannot bet now.";
  if (t === "raise" && !L.canRaise) return "You cannot raise now.";
  if (t === "allin" && !L.canAllIn) return "All-in would exceed the pot-limit (use the slider max).";
  if ((t === "bet" || t === "raise") && action.to != null) {
    const to = action.to;
    if (to < L.minTo - 0.5) return `Minimum is ${L.minTo}.`;
    if (to > L.maxTo + 0.5) return `Pot-limit max is ${L.maxTo}.`;
  }
  return null;
}

function afterActionAdvance(game) {
  const live = livingPlayers(game);
  if (live.length === 1) {
    game.phase = "uncontested";
    game.toAct = null;
    return;
  }
  if (isRoundComplete(game)) {
    game.toAct = null;
    game.phase = "roundComplete";
    return;
  }
  game.toAct = nextCanAct(game, game.toAct);
}

function applyStraddle(game, yes) {
  const utg = leftOf(game.bbSeat, game.players.length);
  const p = game.players[utg];
  if (yes) {
    putChips(game, p, game.straddle);
    game.straddleSeat = utg;
    game.currentBet = p.betThisStreet;
    game.lastRaiseSize = Math.max(game.bb, p.betThisStreet - game.bb);
  } else {
    game.straddleSeat = null;
  }
  beginFirstBetting(game);
}

function beginFirstBetting(game) {
  game.phase = "betting";
  game.streetIndex = 0;
  for (const p of game.players) {
    p.acted = p.folded || p.allIn;
  }
  const from = game.straddleSeat != null ? game.straddleSeat : game.bbSeat;
  game.toAct = nextCanAct(game, from);
  if (game.toAct == null) {
    game.phase = "roundComplete";
  }
}

export function applyAction(game, action) {
  if (!action || !action.type) return { ok: false, error: "No action." };
  const err = assertLegal(game, action);
  if (err) return { ok: false, error: err };
  const p = game.players[game.toAct];
  const t = action.type;
  if (t === "straddle") {
    applyStraddle(game, true);
    return { ok: true };
  }
  if (t === "skipStraddle") {
    applyStraddle(game, false);
    return { ok: true };
  }
  if (t === "fold") {
    p.folded = true;
    p.acted = true;
    afterActionAdvance(game);
    return { ok: true };
  }
  if (t === "check") {
    p.acted = true;
    afterActionAdvance(game);
    return { ok: true };
  }
  if (t === "call") {
    const toCall = Math.max(0, game.currentBet - p.betThisStreet);
    putChips(game, p, toCall);
    p.acted = true;
    afterActionAdvance(game);
    return { ok: true };
  }
  if (t === "bet" || t === "raise") {
    const to = Math.round(action.to);
    const add = to - p.betThisStreet;
    const prev = game.currentBet;
    putChips(game, p, add);
    const newBet = p.betThisStreet;
    const inc = newBet - prev;
    const full = inc >= game.lastRaiseSize;
    if (newBet > game.currentBet) {
      game.currentBet = newBet;
      if (full) {
        game.lastRaiseSize = inc;
        resetActed(game, p.seat);
      } else {
        p.acted = true;
      }
    } else {
      p.acted = true;
    }
    afterActionAdvance(game);
    return { ok: true };
  }
  if (t === "allin") {
    const prev = game.currentBet;
    putChips(game, p, p.stack);
    const newBet = p.betThisStreet;
    const inc = newBet - prev;
    if (newBet > game.currentBet) {
      const full = inc >= game.lastRaiseSize;
      game.currentBet = newBet;
      if (full) {
        game.lastRaiseSize = inc;
        resetActed(game, p.seat);
      } else {
        p.acted = true;
      }
    } else {
      p.acted = true;
    }
    afterActionAdvance(game);
    return { ok: true };
  }
  return { ok: false, error: "Unknown action." };
}

export function snapBetAmount(value, minTo, maxTo, step = 10) {
  let v = Math.round(Number(value));
  if (!Number.isFinite(v)) v = minTo;
  v = Math.max(minTo, Math.min(maxTo, v));
  if (v !== minTo && v !== maxTo && step > 1) {
    const snapped = Math.round((v - minTo) / step) * step + minTo;
    v = Math.max(minTo, Math.min(maxTo, snapped));
  }
  return v;
}

export function defaultSliderTo(L) {
  if (!L) return 0;
  if (L.canBet) return L.maxTo; // pot-sized open
  if (L.canRaise) return L.minTo; // min-raise when facing a bet (safer)
  return L.maxTo || 0;
}

function uniqueCards(list) {
  const seen = new Set();
  for (const c of list) {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
  }
  return true;
}

/**
 * Award each pot high-half / low-half.
 * Two-way chop on a side = 1/4 of that pot; three-way = 1/6.
 * Odd chip to high. No qualifier → high scoops.
 */
export function awardPots(game, evalsIn = null) {
  const n = game.players.length;
  const payouts = Array(n).fill(0);
  const contrib = game.players.map((p) => ({
    seat: p.seat,
    amount: p.committed,
    folded: p.folded,
  }));
  const pots = [];
  let remaining = contrib.filter((c) => c.amount > 0);
  while (remaining.length) {
    const min = Math.min(...remaining.map((c) => c.amount));
    const amount = min * remaining.length;
    const eligible = remaining.filter((c) => !c.folded).map((c) => c.seat);
    pots.push({ amount, eligible: eligible.slice() });
    remaining = remaining
      .map((c) => ({ ...c, amount: c.amount - min }))
      .filter((c) => c.amount > 0);
  }

  const board = game.board;
  const evals = evalsIn || game.players.map((p) => {
    if (p.folded) return { high: null, low: null };
    return {
      high: bestOmahaHigh(p.hole, board),
      low: bestOmahaLow(p.hole, board),
    };
  });

  function distribute(amount, winners) {
    if (amount <= 0 || !winners.length) return;
    const ordered = [];
    for (let i = 1; i <= n; i++) {
      const s = (game.button + i) % n;
      if (winners.includes(s)) ordered.push(s);
    }
    const base = Math.floor(amount / ordered.length);
    let rem = amount - base * ordered.length;
    for (const s of ordered) {
      let add = base;
      if (rem > 0) {
        add++;
        rem--;
      }
      payouts[s] += add;
    }
  }

  const potReports = [];
  for (const pot of pots) {
    const elig = pot.eligible;
    if (!elig.length) continue;
    let highWinners = [elig[0]];
    let bestH = evals[elig[0]].high;
    for (let i = 1; i < elig.length; i++) {
      const s = elig[i];
      const h = evals[s].high;
      const cmp = compareHigh(h, bestH);
      if (cmp > 0) {
        bestH = h;
        highWinners = [s];
      } else if (cmp === 0) highWinners.push(s);
    }
    const lows = elig
      .map((s) => ({ s, low: evals[s].low }))
      .filter((x) => x.low);
    let lowWinners = [];
    let bestL = null;
    for (const x of lows) {
      if (!bestL || compareLow(x.low, bestL) < 0) {
        bestL = x.low;
        lowWinners = [x.s];
      } else if (compareLow(x.low, bestL) === 0) lowWinners.push(x.s);
    }
    const noLow = lowWinners.length === 0;
    if (noLow) {
      distribute(pot.amount, highWinners);
      potReports.push({
        amount: pot.amount,
        highWinners,
        lowWinners: [],
        noLow: true,
        highAmt: pot.amount,
        lowAmt: 0,
      });
    } else {
      const highAmt = Math.ceil(pot.amount / 2);
      const lowAmt = Math.floor(pot.amount / 2);
      distribute(highAmt, highWinners);
      distribute(lowAmt, lowWinners);
      potReports.push({
        amount: pot.amount,
        highWinners,
        lowWinners,
        noLow: false,
        highAmt,
        lowAmt,
      });
    }
  }

  for (let s = 0; s < n; s++) {
    game.players[s].stack += payouts[s];
    game.players[s].won = payouts[s];
  }
  const totalPot = game.pot;
  game.pot = 0;
  game.showdownEvals = evals;
  game.payouts = payouts;
  game.potReports = potReports;
  game.totalPot = totalPot;
  return { payouts, potReports, evals, totalPot };
}

function shareWord(winners, side, potAmount) {
  const n = winners.length;
  if (n === 1) return null;
  if (n === 2) return "quarter";
  if (n === 3) return "sixth";
  return `1/${n * 2} share of the pot on ${side}`;
}

export function narrateShowdown(game) {
  const names = game.players.map((p) => p.name);
  const you = (s) => names[s];
  const pot = game.totalPot;
  const reports = game.potReports || [];
  const evals = game.showdownEvals || [];
  const payouts = game.payouts || [];
  if (game.phase === "uncontested" || (livingPlayers(game).length === 1 && !reports.length)) {
    const w = livingPlayers(game)[0];
    return `Everyone else folded. ${w.name} wins ${game.uncontestedAmount ?? w.won ?? pot} without a showdown.`;
  }

  const parts = [];
  const main = reports[0] || { highWinners: [], lowWinners: [], noLow: true, amount: pot };
  const hw = main.highWinners || [];
  const lw = main.lowWinners || [];

  function handHigh(s) {
    const h = evals[s]?.high;
    if (!h) return "";
    return `${formatCards(h.five)} (${h.name})`;
  }
  function handLow(s) {
    const l = evals[s]?.low;
    if (!l) return "";
    return `${formatCards(l.five)} (${l.name})`;
  }

  if (main.noLow) {
    if (hw.length === 1) {
      parts.push(
        `Nobody made an 8-or-better low, so high scoops the whole pot. ${you(hw[0])} wins high with ${handHigh(hw[0])}.`
      );
    } else {
      parts.push(
        `Nobody made an 8-or-better low, so high scoops. ${hw.map(you).join(" and ")} tie for high with ${handHigh(hw[0])}.`
      );
    }
  } else {
    const scoop = hw.length === 1 && lw.length === 1 && hw[0] === lw[0];
    if (scoop) {
      parts.push(
        `${you(hw[0])} scoops (wins high and low) — high ${handHigh(hw[0])}, low ${handLow(lw[0])}.`
      );
    } else {
      if (hw.length === 1) {
        parts.push(`${you(hw[0])} wins high with ${handHigh(hw[0])}.`);
      } else {
        const q = shareWord(hw, "high", pot);
        parts.push(
          `${hw.map(you).join(" and ")} tie for high with ${handHigh(hw[0])}.` +
            (q === "quarter"
              ? " Each tied high player gets a quarter of the pot."
              : q === "sixth"
                ? " Each tied high player gets a sixth of the pot."
                : "")
        );
      }
      if (lw.length === 1) {
        parts.push(`${you(lw[0])} wins low with ${handLow(lw[0])}.`);
      } else if (lw.length > 1) {
        const q = shareWord(lw, "low", pot);
        parts.push(
          `${lw.map(you).join(" and ")} tie for low with ${handLow(lw[0])}.` +
            (q === "quarter"
              ? " Each tied low player gets a quarter of the pot."
              : q === "sixth"
                ? " Each tied low player gets a sixth of the pot."
                : "")
        );
      }
    }
  }

  const payBits = [];
  for (let s = 0; s < game.players.length; s++) {
    if (payouts[s] > 0) payBits.push(`${you(s)} gets ${payouts[s]}`);
  }
  parts.push(`Pot ${pot}: ${payBits.join(", ") || "no chips awarded"}.`);

  // Extra dummy-proof line for the human
  // Solo table only: in multiplayer every seat is human, so "You" would be wrong for others.
  const humans = game.players.filter((p) => p.isHuman);
  const human = humans.length === 1 ? humans[0] : null;
  if (human) {
    const got = payouts[human.seat] || 0;
    const tiedHigh = hw.includes(human.seat) && hw.length > 1;
    const tiedLow = lw.includes(human.seat) && lw.length > 1;
    if (tiedHigh && hw.length === 2) {
      parts.push("You tied high, so you get a quarter.");
    } else if (tiedHigh && hw.length === 3) {
      parts.push("You tied high, so you get a sixth.");
    } else if (tiedLow && lw.length === 2) {
      parts.push("You tied low, so you get a quarter.");
    } else if (tiedLow && lw.length === 3) {
      parts.push("You tied low, so you get a sixth.");
    } else if (got === 0 && !human.folded) {
      parts.push("You did not win high or low this hand.");
    }
  }
  return parts.join(" ");
}

export function finishUncontested(game) {
  const w = livingPlayers(game)[0];
  const amt = game.pot;
  w.stack += amt;
  w.won = amt;
  game.uncontestedAmount = amt;
  game.pot = 0;
  game.payouts = game.players.map((p) => (p.seat === w.seat ? amt : 0));
  game.totalPot = amt;
  game.phase = "showdown";
  game.toAct = null;
  game.narration = narrateShowdown(game);
  return game.narration;
}

export function resolveShowdown(game) {
  awardPots(game);
  game.phase = "showdown";
  game.toAct = null;
  game.narration = narrateShowdown(game);
  return game.narration;
}

export function flipThree(game, rng = game.rng) {
  const hidden = [];
  for (let i = 0; i < 9; i++) if (!game.revealed[i]) hidden.push(i);
  const pick = shuffle(hidden, rng).slice(0, Math.min(3, hidden.length));
  pick.sort((a, b) => a - b);
  for (const i of pick) game.revealed[i] = true;
  game.lastFlip = pick;
  return pick;
}

export function startBettingRound(game) {
  game.currentBet = 0;
  game.lastRaiseSize = game.bb;
  game.phase = "betting";
  for (const p of game.players) {
    p.betThisStreet = 0;
    p.acted = p.folded || p.allIn;
  }
  game.toAct = nextCanAct(game, game.button);
  if (game.toAct == null || actors(game).length < 2) {
    game.phase = "roundComplete";
    game.toAct = null;
  }
}

export function needsRunout(game) {
  return actors(game).length < 2 && livingPlayers(game).length >= 2;
}

export function createGame({
  seatCount = 6,
  rng = cryptoRandom,
  sb = SB,
  bb = BB,
  straddle = STRADDLE,
  startStack = START_STACK,
} = {}) {
  if (seatCount < 2 || seatCount > 7) {
    throw new Error("Table must be 2–7 seats.");
  }
  const stack0 = startStack > 0 ? startStack : bb * 100;
  const players = [];
  for (let i = 0; i < seatCount; i++) {
    players.push({
      seat: i,
      name: i === 0 ? "You" : `Bot ${i + 1}`,
      isHuman: i === 0,
      stack: stack0,
      hole: [],
      folded: false,
      allIn: false,
      betThisStreet: 0,
      committed: 0,
      acted: false,
      won: 0,
    });
  }
  return {
    seatCount,
    players,
    button: seatCount - 1,
    bb,
    sb,
    straddle,
    startStack: stack0,
    pot: 0,
    currentBet: 0,
    lastRaiseSize: bb,
    toAct: null,
    board: Array(9).fill(null),
    revealed: Array(9).fill(false),
    lastFlip: [],
    deck: [],
    phase: "idle",
    streetIndex: 0,
    straddleSeat: null,
    sbSeat: 0,
    bbSeat: 1,
    handNumber: 0,
    rng,
    narration: "",
    payouts: [],
    showdownEvals: [],
    potReports: [],
    totalPot: 0,
  };
}

export function startHand(game) {
  game.handNumber += 1;
  if (game.handNumber > 1) {
    game.button = leftOf(game.button, game.players.length);
  }
  const n = game.players.length;
  game.sbSeat = leftOf(game.button, n);
  game.bbSeat = leftOf(game.sbSeat, n);
  for (const p of game.players) {
    // No auto top-up — Ian bankroll: reload manually when stack < TABLE_MIN
    p.hole = [];
    p.folded = false;
    p.allIn = false;
    p.betThisStreet = 0;
    p.committed = 0;
    p.acted = false;
    p.won = 0;
  }
  game.pot = 0;
  game.currentBet = 0;
  game.lastRaiseSize = game.bb;
  game.board = Array(9).fill(null);
  game.revealed = Array(9).fill(false);
  game.lastFlip = [];
  game.straddleSeat = null;
  game.narration = "";
  game.payouts = [];
  game.showdownEvals = [];
  game.potReports = [];
  game.streetIndex = 0;
  game.totalPot = 0;

  let deck = shuffle(createDeck(), game.rng);
  // Deal 6 laps of one down card, starting left of the button.
  for (let lap = 0; lap < 6; lap++) {
    for (let i = 1; i <= n; i++) {
      const seat = (game.button + i) % n;
      game.players[seat].hole.push(deck.pop());
    }
  }
  for (let i = 0; i < 9; i++) game.board[i] = deck.pop();
  game.deck = deck; // leftover (1 card when 7-handed)
  if (n * 6 + 9 > 52) throw new Error("Dealt more than 52 cards");

  putChips(game, game.players[game.sbSeat], game.sb);
  putChips(game, game.players[game.bbSeat], game.bb);
  game.currentBet = Math.max(
    game.players[game.sbSeat].betThisStreet,
    game.players[game.bbSeat].betThisStreet
  );
  game.lastRaiseSize = game.bb;

  const utg = leftOf(game.bbSeat, n);
  const utgP = game.players[utg];
  if (!utgP.folded && !utgP.allIn && utgP.stack >= game.straddle) {
    game.phase = "straddle";
    game.toAct = utg;
  } else {
    beginFirstBetting(game);
  }
  return game;
}

export function skipStraddleIfNeeded(game) {
  if (game.phase === "straddle") applyStraddle(game, false);
}

export function coachText(game) {
  if (!game || game.phase === "idle") {
    return "Pick 5, 6, or 7 seats (6 is default), then sit down.";
  }
  if (game.phase === "dealing") {
    return "Dealing 6 private cards each, then 9 board cards face down.";
  }
  if (game.phase === "straddle") {
    const p = game.players[game.toAct];
    if (p?.isHuman) {
      return "Your turn. You're under the gun. Optional live straddle of 100 — skip if you're unsure.";
    }
    return `${p?.name || "A player"} is deciding whether to straddle 100.`;
  }
  if (game.phase === "showdown") {
    return game.narration || "Showdown.";
  }
  if (game.phase === "uncontested") {
    return game.narration || "Everyone else folded.";
  }
  if (game.phase === "roundComplete") {
    return streetCoach(game) + " Betting is done this street.";
  }
  if (game.phase === "betting") {
    const p = game.players[game.toAct];
    const street = streetCoach(game);
    if (!p) return street;
    if (!p.isHuman) return `${street} Waiting for ${p.name}…`;
    const L = getLegalActions(game, p.seat);
    const bits = [];
    if (L.canCheck) bits.push("check");
    if (L.canCall) bits.push(`call ${L.callAmount}`);
    if (L.canFold) bits.push("fold");
    if (L.canBet) bits.push(`bet up to ${L.maxTo}`);
    if (L.canRaise) bits.push(`raise up to ${L.maxTo}`);
    if (L.canAllIn && !L.canBet && !L.canRaise) bits.push("go all-in");
    const list =
      bits.length === 0
        ? "wait"
        : bits.length === 1
          ? bits[0]
          : bits.slice(0, -1).join(", ") + ", or " + bits[bits.length - 1];
    return `Your turn. ${list.charAt(0).toUpperCase() + list.slice(1)}. ${street}`;
  }
  return streetCoach(game);
}

export function shouldConfirmFold(game, seat) {
  const p = game.players[seat];
  if (!p) return false;
  if (p.betThisStreet > 0) return true;
  if (hasMadeHand(game)) return true;
  return false;
}

/** Build a minimal table for unit tests (fixed cards, equal commits).
 *  Fewer than 5 hands are padded with folded dummy seats so the 5–7 rule holds.
 */
export function testTable({ holes, board, committed, button = 0, folded = [] }) {
  const used = new Set();
  const toCard = (c) => {
    const x = typeof c === "string" ? parseCard(c) : c;
    used.add(x.code);
    return x;
  };
  const boardCards = board.map(toCard);
  const holeCards = holes.map((h) => h.map(toCard));
  const foldFlags = holes.map((_, i) => !!folded[i]);
  const commits = committed.slice();
  const leftover = createDeck().filter((c) => !used.has(c.code));
  while (holeCards.length < 5) {
    const dummy = leftover.splice(0, 6);
    holeCards.push(dummy);
    foldFlags.push(true);
    commits.push(0);
  }
  if (holeCards.length > 7) throw new Error("Table must be 5, 6, or 7 seats.");
  const game = createGame({ seatCount: holeCards.length });
  game.button = button;
  game.board = boardCards;
  game.revealed = Array(9).fill(true);
  game.pot = 0;
  for (let i = 0; i < holeCards.length; i++) {
    const p = game.players[i];
    p.hole = holeCards[i];
    p.committed = commits[i] || 0;
    p.stack = START_STACK;
    p.folded = foldFlags[i];
    p.allIn = false;
    game.pot += p.committed;
  }
  const all = [...game.board, ...game.players.flatMap((p) => p.hole)];
  if (!uniqueCards(all)) throw new Error("Duplicate cards in test setup");
  if (all.length > 52) throw new Error("Too many cards");
  return game;
}
