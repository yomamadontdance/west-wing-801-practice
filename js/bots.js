import { getLegalActions, bestOmahaHigh, bestOmahaLow, revealedBoard, STRADDLE } from "./engine.js";

function holeStrength(hole) {
  const ranks = hole.map((c) => (c.rank === 12 ? 14 : c.rank + 2));
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
  let pairs = 0;
  let trips = 0;
  for (const n of counts.values()) {
    if (n === 2) pairs++;
    if (n >= 3) trips++;
  }
  const highs = ranks.filter((r) => r >= 12).length;
  const wheel = ranks.filter((r) => r === 14 || r <= 5).length;
  let s = 0.15 + pairs * 0.12 + trips * 0.2 + highs * 0.04 + Math.min(wheel, 4) * 0.03;
  return Math.max(0.05, Math.min(0.95, s));
}

function madeStrength(hole, board) {
  if (!board || board.length < 3) return holeStrength(hole);
  const h = bestOmahaHigh(hole, board);
  const l = bestOmahaLow(hole, board);
  let s = 0.2;
  if (h) {
    s = 0.15 + h.cat * 0.09;
    if (h.cat >= 4) s += 0.15;
  }
  if (l) {
    s = Math.max(s, 0.55);
    if (l.isWheel) s = Math.max(s, 0.85);
    else if (l.vals[0] <= 6) s = Math.max(s, 0.7);
  }
  return Math.max(0.05, Math.min(0.95, s));
}

function pickSize(L, strength, rng) {
  const min = L.minTo;
  const max = L.maxTo;
  if (max <= min) return max;
  if (strength > 0.8 && rng() < 0.5) return max;
  if (rng() < 0.35) return min;
  const t = 0.35 + rng() * 0.5;
  return Math.round(min + (max - min) * t);
}

/** Medium/loose, legal-only, never GTO. */
export function chooseBotAction(game, rng = Math.random) {
  const seat = game.toAct;
  const p = game.players[seat];
  const L = getLegalActions(game, seat);
  if (L.canStraddle) {
    return rng() < 0.1 ? { type: "straddle" } : { type: "skipStraddle" };
  }
  const board = revealedBoard(game);
  const strength = madeStrength(p.hole, board);
  const toCall = L.toCall || 0;
  const stack = p.stack;

  if (L.canCheck) {
    if (L.canBet && strength > 0.62 && rng() < 0.4) {
      return { type: "bet", to: pickSize(L, strength, rng) };
    }
    if (L.canBet && strength > 0.8 && rng() < 0.55) {
      return { type: "bet", to: L.maxTo };
    }
    return { type: "check" };
  }

  // Facing a bet — loose: rarely fold small bets
  const fraction = toCall / Math.max(1, stack);
  const scary = fraction > 0.25 || toCall > game.pot * 0.6;
  if (strength < 0.18 && scary && L.canFold) return { type: "fold" };
  if (strength < 0.12 && fraction > 0.12 && L.canFold) return { type: "fold" };

  if (L.canRaise && strength > 0.72 && rng() < 0.38) {
    return { type: "raise", to: pickSize(L, strength, rng) };
  }
  if (L.canCall) return { type: "call" };
  if (L.canAllIn) {
    if (strength > 0.35 || toCall >= stack) return { type: "allin" };
    if (L.canFold) return { type: "fold" };
    return { type: "allin" };
  }
  if (L.canFold) return { type: "fold" };
  if (L.canCheck) return { type: "check" };
  return { type: "check" };
}
