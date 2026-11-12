import type { Game } from "./types";

export const connect4: Game = {
  initialState: () => ({ board: Array.from({ length: 6 }, () => Array(7).fill(null)) }),
  applyMove(state: { board: (0 | 1 | null)[][] }, move: { col: number }, player) {
    const { col } = move;
    if (!Number.isInteger(col) || col < 0 || col > 6) return { error: "Bad column" };

    const board = state.board.map((r) => [...r]);
    const row = [5, 4, 3, 2, 1, 0].find((r) => board[r][col] === null);
    if (row === undefined) return { error: "Column full" };
    board[row][col] = player;

    // count matching discs in one direction
    const run = (dr: number, dc: number) => {
      let n = 0;
      let r = row + dr;
      let c = col + dc;
      while (board[r]?.[c] === player) {
        n++;
        r += dr;
        c += dc;
      }
      return n;
    };
    const won = [[0, 1], [1, 0], [1, 1], [1, -1]].some(
      ([dr, dc]) => 1 + run(dr, dc) + run(-dr, -dc) >= 4
    );
    const full = board[0].every((c) => c !== null);
    return {
      state: { board },
      winner: won ? player : full ? "draw" : null,
      nextTurn: player === 0 ? 1 : 0,
    };
  },
};
