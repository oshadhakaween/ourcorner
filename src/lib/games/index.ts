import { tictactoe } from "./tictactoe";
import { connect4 } from "./connect4";
import { memory } from "./memory";

// To add a game: write its rules file, then list it here. That's all.
export const games = { tictactoe, connect4, memory };
export type GameName = keyof typeof games;
export const GAME_NAMES = Object.keys(games) as [GameName, ...GameName[]];
