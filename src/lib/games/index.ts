import { tictactoe } from "./tictactoe";
import { connect4 } from "./connect4";

// To add a game: write its rules file, then list it here.
export const games = { tictactoe, connect4 };
export type GameName = keyof typeof games;
