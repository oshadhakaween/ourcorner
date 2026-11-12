import type { Game } from "./types";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const tictactoe: Game = {
  initialState: () => ({ board: Array(9).fill(null) }),
  applyMove(state: { board: (0 | 1 | null)[] }, move: { cell: number }, player) {
    const { cell } = move;
    if (!Number.isInteger(cell) || cell < 0 || cell > 8) return { error: "Bad cell" };
    if (state.board[cell] !== null) return { error: "Cell taken" };

    const board = [...state.board];
    board[cell] = player;
    const won = LINES.some((l) => l.every((i) => board[i] === player));
    const full = board.every((c) => c !== null);
    return {
      state: { board },
      winner: won ? player : full ? "draw" : null,
      nextTurn: player === 0 ? 1 : 0,
    };
  },
};
