import type { Game } from "./types";

const FACES = ["💖", "🌸", "⭐", "🧸", "🌙", "🦋", "🍓", "☕"]; // 8 pairs = 16 cards

type MemoryState = {
  cards: string[]; // what is on each card (4 x 4)
  matched: (0 | 1 | null)[]; // who matched each card (null = not matched yet)
  flipped: number[]; // face-up right now during someone's turn (0 or 1 cards)
  shown: number[]; // the last two cards that did NOT match, still face-up until the next move
  scores: [number, number];
};

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export const memory: Game = {
  initialState: (): MemoryState => ({
    cards: shuffle([...FACES, ...FACES]),
    matched: Array(16).fill(null),
    flipped: [],
    shown: [],
    scores: [0, 0],
  }),

  // Flip two cards per turn. A match scores a point and you go again.
  // A miss stays face-up until the other person flips their first card, so they can remember it.
  applyMove(state: MemoryState, move: { index: number }, player) {
    const { index } = move;
    if (!Number.isInteger(index) || index < 0 || index > 15) return { error: "Bad card" };
    if (state.matched[index] !== null) return { error: "Already matched" };
    if (state.flipped.includes(index)) return { error: "Already flipped" };

    const st: MemoryState = {
      cards: state.cards,
      matched: [...state.matched],
      flipped: [...state.flipped],
      shown: [],
      scores: [state.scores[0], state.scores[1]],
    };
    st.flipped.push(index);

    // first card of the turn: same player keeps going
    if (st.flipped.length === 1) return { state: st, winner: null, nextTurn: player };

    const [a, b] = st.flipped;
    st.flipped = [];

    if (st.cards[a] === st.cards[b]) {
      st.matched[a] = player;
      st.matched[b] = player;
      st.scores[player] += 1;
      if (st.matched.every((m) => m !== null)) {
        const winner = st.scores[0] > st.scores[1] ? 0 : st.scores[1] > st.scores[0] ? 1 : "draw";
        return { state: st, winner, nextTurn: player };
      }
      return { state: st, winner: null, nextTurn: player }; // a match = another go
    }

    st.shown = [a, b];
    return { state: st, winner: null, nextTurn: player === 0 ? 1 : 0 };
  },
};
