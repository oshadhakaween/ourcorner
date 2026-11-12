/* eslint-disable @typescript-eslint/no-explicit-any */
export type Winner = 0 | 1 | "draw" | null; // 0 = host, 1 = guest
export type MoveResult = { state: unknown; winner: Winner; nextTurn: 0 | 1 };

// Every game is just two functions: how it starts, and what a move does.
export type Game = {
  initialState: () => unknown;
  applyMove: (state: any, move: any, player: 0 | 1) => MoveResult | { error: string };
};
