const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PLAYERS,
  PHASES,
  GAME_STATUS,
  ACTIONS,
} = require("./constants");

const {
  createInitialState,
  applyAction,
  getLegalMoves,
  getAvailableCaptureTargets,
  getGameSummary,
} = require("./engine");

const {
  getPlayerPositions,
  getEmptyPositions,
  isMill,
} = require("./board");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function createGame() {
  return createInitialState({
    gameId: "test-game-001",
    whitePlayerId: "white-player",
    blackPlayerId: "black-player",
  });
}

function place(state, position) {
  return applyAction(state, {
    type: ACTIONS.PLACE,
    player: state.currentPlayer,
    position,
  });
}

function move(state, from, to) {
  return applyAction(state, {
    type: ACTIONS.MOVE,
    player: state.currentPlayer,
    from,
    to,
  });
}

function capture(state, position) {
  return applyAction(state, {
    type: ACTIONS.CAPTURE,
    player: state.currentPlayer,
    position,
  });
}

/*
|--------------------------------------------------------------------------
| Initial State
|--------------------------------------------------------------------------
*/

test("creates a valid initial game state", () => {
  const state = createGame();

  assert.equal(state.gameId, "test-game-001");
  assert.equal(state.currentPlayer, PLAYERS.WHITE);
  assert.equal(state.phase, PHASES.PLACEMENT);
  assert.equal(state.status, GAME_STATUS.ACTIVE);

  assert.equal(state.piecesRemaining.white, 12);
  assert.equal(state.piecesRemaining.black, 12);

  assert.equal(state.piecesOnBoard.white, 0);
  assert.equal(state.piecesOnBoard.black, 0);

  assert.equal(state.pendingCapture, false);
  assert.equal(state.moveNumber, 0);

  assert.equal(
    getPlayerPositions(
      state.board,
      PLAYERS.WHITE
    ).length,
    0
  );

  assert.equal(
    getPlayerPositions(
      state.board,
      PLAYERS.BLACK
    ).length,
    0
  );
});

/*
|--------------------------------------------------------------------------
| Board
|--------------------------------------------------------------------------
*/

test("initial board contains 24 empty positions", () => {
  const state = createGame();

  const emptyPositions =
    getEmptyPositions(state.board);

  assert.equal(emptyPositions.length, 24);
});

test("players cannot place on an occupied position", () => {
  let state = createGame();

  state = place(state, 0);

  assert.throws(() => {
    applyAction(state, {
      type: ACTIONS.PLACE,
      player: PLAYERS.BLACK,
      position: 0,
    });
  });
});

/*
|--------------------------------------------------------------------------
| Placement
|--------------------------------------------------------------------------
*/

test("white can place a piece", () => {
  const state = createGame();

  const nextState = place(state, 0);

  assert.equal(
    nextState.board[0],
    PLAYERS.WHITE
  );

  assert.equal(
    nextState.piecesRemaining.white,
    11
  );

  assert.equal(
    nextState.piecesOnBoard.white,
    1
  );

  assert.equal(
    nextState.currentPlayer,
    PLAYERS.BLACK
  );

  assert.equal(
    nextState.moveNumber,
    1
  );
});

test("black can place a piece after white", () => {
  let state = createGame();

  state = place(state, 0);
  state = place(state, 1);

  assert.equal(
    state.board[0],
    PLAYERS.WHITE
  );

  assert.equal(
    state.board[1],
    PLAYERS.BLACK
  );

  assert.equal(
    state.piecesRemaining.white,
    11
  );

  assert.equal(
    state.piecesRemaining.black,
    11
  );

  assert.equal(
    state.piecesOnBoard.white,
    1
  );

  assert.equal(
    state.piecesOnBoard.black,
    1
  );

  assert.equal(
    state.currentPlayer,
    PLAYERS.WHITE
  );
});

test("placement alternates between players", () => {
  let state = createGame();

  state = place(state, 0);

  assert.equal(
    state.currentPlayer,
    PLAYERS.BLACK
  );

  state = place(state, 1);

  assert.equal(
    state.currentPlayer,
    PLAYERS.WHITE
  );

  state = place(state, 2);

  assert.equal(
    state.currentPlayer,
    PLAYERS.BLACK
  );
});

/*
|--------------------------------------------------------------------------
| Mills
|--------------------------------------------------------------------------
*/

test("detects a completed mill", () => {
  let state = createGame();

  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;

  state.piecesOnBoard.white = 2;
  state.piecesRemaining.white = 10;

  state.currentPlayer = PLAYERS.WHITE;

  state = place(state, 2);

  assert.equal(
    isMill(
      state.board,
      2,
      PLAYERS.WHITE
    ),
    true
  );

  assert.equal(
    state.pendingCapture,
    true
  );
});

test("forming a mill creates a pending capture", () => {
  let state = createGame();

  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;

  state.piecesOnBoard.white = 2;
  state.piecesRemaining.white = 10;

  state.currentPlayer = PLAYERS.WHITE;

  state = place(state, 2);

  assert.equal(
    state.pendingCapture,
    true
  );

  assert.equal(
    state.currentPlayer,
    PLAYERS.WHITE
  );
});

test("player can capture after forming a mill", () => {
  let state = createGame();

  /*
   * White mill: 0 - 1 - 2
   */
  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;

  state.piecesOnBoard.white = 2;
  state.piecesRemaining.white = 10;

  /*
   * Black has four pieces.
   *
   * 8, 9 and 10 form a mill.
   * 12 is outside the mill.
   */
  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;
  state.board[10] = PLAYERS.BLACK;
  state.board[12] = PLAYERS.BLACK;

  state.piecesOnBoard.black = 4;
  state.piecesRemaining.black = 8;

  state.currentPlayer = PLAYERS.WHITE;
  state.phase = PHASES.PLACEMENT;

  /*
   * Complete the White mill.
   */
  state = place(state, 2);

  assert.equal(
    state.pendingCapture,
    true
  );

  /*
   * Because Black has a piece outside
   * a mill, only position 12 should be
   * capturable.
   */
  const targets =
    getAvailableCaptureTargets(state);

  assert.ok(
    targets.includes(12)
  );

  assert.equal(
    targets.includes(8),
    false
  );

  assert.equal(
    targets.includes(9),
    false
  );

  assert.equal(
    targets.includes(10),
    false
  );

  state = capture(state, 12);

  assert.equal(
    state.board[12],
    null
  );

  assert.equal(
    state.piecesOnBoard.black,
    3
  );

  assert.equal(
    state.pendingCapture,
    false
  );

  assert.equal(
    state.currentPlayer,
    PLAYERS.BLACK
  );

  assert.equal(
    state.status,
    GAME_STATUS.ACTIVE
  );
});

test("cannot capture a protected mill while other pieces exist", () => {
  let state = createGame();

  /*
   * White has a completed mill.
   */
  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;
  state.board[2] = PLAYERS.WHITE;

  state.piecesOnBoard.white = 3;
  state.piecesRemaining.white = 9;

  /*
   * Black has a mill at 8-9-10
   * and another piece at 12.
   */
  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;
  state.board[10] = PLAYERS.BLACK;
  state.board[12] = PLAYERS.BLACK;

  state.piecesOnBoard.black = 4;
  state.piecesRemaining.black = 8;

  state.pendingCapture = true;
  state.currentPlayer = PLAYERS.WHITE;
  state.phase = PHASES.MOVEMENT;

  const targets =
    getAvailableCaptureTargets(state);

  /*
   * Only the non-mill piece should
   * be available.
   */
  assert.deepEqual(
    targets,
    [12]
  );
});

/*
|--------------------------------------------------------------------------
| Movement
|--------------------------------------------------------------------------
*/

test("player can make an adjacent movement", () => {
  let state = createGame();

  state.phase = PHASES.MOVEMENT;
  state.currentPlayer = PLAYERS.WHITE;

  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;
  state.board[2] = PLAYERS.WHITE;

  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;
  state.board[10] = PLAYERS.BLACK;

  state.piecesOnBoard.white = 3;
  state.piecesOnBoard.black = 3;

  state = move(state, 0, 7);

  assert.equal(
    state.board[0],
    null
  );

  assert.equal(
    state.board[7],
    PLAYERS.WHITE
  );

  assert.equal(
    state.piecesOnBoard.white,
    3
  );

  assert.equal(
    state.piecesOnBoard.black,
    3
  );

  assert.equal(
    state.currentPlayer,
    PLAYERS.BLACK
  );

  assert.equal(
    state.status,
    GAME_STATUS.ACTIVE
  );
});

test("player can move to a connected position", () => {
  let state = createGame();

  state.phase = PHASES.MOVEMENT;
  state.currentPlayer = PLAYERS.WHITE;

  /*
   * White pieces.
   */
  state.board[0] = PLAYERS.WHITE;
  state.board[2] = PLAYERS.WHITE;
  state.board[6] = PLAYERS.WHITE;

  /*
   * Black pieces.
   */
  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;
  state.board[10] = PLAYERS.BLACK;

  state.piecesOnBoard.white = 3;
  state.piecesOnBoard.black = 3;

  /*
   * 0 -> 1 is a connected move.
   * Position 1 is intentionally empty.
   */
  state = move(state, 0, 1);

  assert.equal(
    state.board[0],
    null
  );

  assert.equal(
    state.board[1],
    PLAYERS.WHITE
  );
});

test("player cannot move onto an occupied position", () => {
  let state = createGame();

  state.phase = PHASES.MOVEMENT;
  state.currentPlayer = PLAYERS.WHITE;

  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;
  state.board[2] = PLAYERS.WHITE;

  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;
  state.board[10] = PLAYERS.BLACK;

  state.piecesOnBoard.white = 3;
  state.piecesOnBoard.black = 3;

  assert.throws(() => {
    move(state, 0, 1);
  });
});

test("player cannot move an opponent piece", () => {
  let state = createGame();

  state.phase = PHASES.MOVEMENT;
  state.currentPlayer = PLAYERS.WHITE;

  state.board[0] = PLAYERS.BLACK;

  state.board[1] = PLAYERS.WHITE;
  state.board[2] = PLAYERS.WHITE;
  state.board[3] = PLAYERS.WHITE;

  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;

  state.piecesOnBoard.white = 3;
  state.piecesOnBoard.black = 3;

  assert.throws(() => {
    move(state, 0, 7);
  });
});

/*
|--------------------------------------------------------------------------
| Flying
|--------------------------------------------------------------------------
*/

test("player can fly when exactly three pieces remain", () => {
  let state = createGame();

  state.phase = PHASES.MOVEMENT;
  state.currentPlayer = PLAYERS.WHITE;

  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;
  state.board[2] = PLAYERS.WHITE;

  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;
  state.board[10] = PLAYERS.BLACK;

  state.piecesOnBoard.white = 3;
  state.piecesOnBoard.black = 3;

  state = move(state, 0, 23);

  assert.equal(
    state.board[0],
    null
  );

  assert.equal(
    state.board[23],
    PLAYERS.WHITE
  );
});

/*
|--------------------------------------------------------------------------
| Legal Moves
|--------------------------------------------------------------------------
*/

test("getLegalMoves returns placement moves during placement", () => {
  const state = createGame();

  const moves =
    getLegalMoves(state);

  assert.equal(
    moves.length,
    24
  );

  assert.ok(
    moves.some(
      (move) =>
        move.type === ACTIONS.PLACE &&
        move.position === 0
    )
  );
});

test("getLegalMoves returns movement moves during movement phase", () => {
  let state = createGame();

  state.phase = PHASES.MOVEMENT;
  state.currentPlayer = PLAYERS.WHITE;

  state.board[0] = PLAYERS.WHITE;
  state.board[1] = PLAYERS.WHITE;
  state.board[2] = PLAYERS.WHITE;

  state.board[8] = PLAYERS.BLACK;
  state.board[9] = PLAYERS.BLACK;
  state.board[10] = PLAYERS.BLACK;

  state.piecesOnBoard.white = 3;
  state.piecesOnBoard.black = 3;

  const moves =
    getLegalMoves(state);

  assert.ok(
    moves.length > 0
  );

  assert.ok(
    moves.some(
      (move) =>
        move.type === ACTIONS.MOVE &&
        move.from === 0
    )
  );
});

/*
|--------------------------------------------------------------------------
| Resignation
|--------------------------------------------------------------------------
*/

test("player can resign", () => {
  let state = createGame();

  state = applyAction(state, {
    type: ACTIONS.RESIGN,
    player: PLAYERS.WHITE,
  });

  assert.equal(
    state.status,
    GAME_STATUS.FINISHED
  );

  assert.equal(
    state.winner,
    PLAYERS.BLACK
  );

  assert.equal(
    state.loser,
    PLAYERS.WHITE
  );
});

/*
|--------------------------------------------------------------------------
| Invalid Actions
|--------------------------------------------------------------------------
*/

test("cannot make a move when game is finished", () => {
  let state = createGame();

  state.status =
    GAME_STATUS.FINISHED;

  state.winner =
    PLAYERS.WHITE;

  state.loser =
    PLAYERS.BLACK;

  assert.throws(() => {
    applyAction(state, {
      type: ACTIONS.PLACE,
      player: PLAYERS.WHITE,
      position: 0,
    });
  });
});

test("cannot play when it is not the player's turn", () => {
  const state = createGame();

  assert.throws(() => {
    applyAction(state, {
      type: ACTIONS.PLACE,
      player: PLAYERS.BLACK,
      position: 0,
    });
  });
});

/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

test("getGameSummary returns useful game information", () => {
  const state = createGame();

  const summary =
    getGameSummary(state);

  assert.equal(
    summary.gameId,
    "test-game-001"
  );

  assert.equal(
    summary.whitePlayerId,
    "white-player"
  );

  assert.equal(
    summary.blackPlayerId,
    "black-player"
  );

  assert.equal(
    summary.currentPlayer,
    PLAYERS.WHITE
  );

  assert.equal(
    summary.phase,
    PHASES.PLACEMENT
  );

  assert.equal(
    summary.status,
    GAME_STATUS.ACTIVE
  );

  assert.equal(
    summary.moveNumber,
    0
  );
});