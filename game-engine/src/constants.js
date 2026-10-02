const PLAYERS = Object.freeze({
  WHITE: "white",
  BLACK: "black"
});

const PHASES = Object.freeze({
  PLACEMENT: "placement",
  MOVEMENT: "movement",
  FINISHED: "finished"
});

const GAME_STATUS = Object.freeze({
  ACTIVE: "active",
  FINISHED: "finished",
  DRAW: "draw"
});

const ACTIONS = Object.freeze({
  PLACE: "PLACE",
  MOVE: "MOVE",
  CAPTURE: "CAPTURE",
  RESIGN: "RESIGN"
});

const POSITIONS = Object.freeze(
  Array.from({ length: 24 }, (_, id) => id)
);

const CONNECTIONS = Object.freeze({
  0: [1, 7],
  1: [0, 2, 9],
  2: [1, 3],
  3: [2, 4, 11],
  4: [3, 5],
  5: [4, 6, 13],
  6: [5, 7],
  7: [6, 0, 15],

  8: [9, 15],
  9: [8, 10, 1, 17],
  10: [9, 11],
  11: [10, 12, 3, 19],
  12: [11, 13],
  13: [12, 14, 5, 21],
  14: [13, 15],
  15: [14, 8, 7, 23],

  16: [17, 23],
  17: [16, 18, 9],
  18: [17, 19],
  19: [18, 20, 11],
  20: [19, 21],
  21: [20, 22, 13],
  22: [21, 23],
  23: [22, 16, 15]
});

/*
 * Every possible mill/alignment.
 *
 * There are 16 possible three-position lines.
 */
const MILLS = Object.freeze([
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],

  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],

  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],

  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23]
]);

const DEFAULT_RULES = Object.freeze({
  piecesPerPlayer: 12,

  /*
   * When a player has exactly three pieces on the board,
   * they may move to any empty position.
   */
  allowFlyingAtThree: true,

  /*
   * A player normally cannot capture an opponent's piece
   * that belongs to a mill if the opponent has pieces
   * outside mills.
   */
  protectMillsWhenPossible: true,

  /*
   * Optional draw rules.
   *
   * Disabled by default so the engine does not impose
   * a tournament-specific draw rule.
   */
  repetitionLimit: 0,
  nonCaptureMoveLimit: 0
});

module.exports = {
  PLAYERS,
  PHASES,
  GAME_STATUS,
  ACTIONS,
  POSITIONS,
  CONNECTIONS,
  MILLS,
  DEFAULT_RULES
};