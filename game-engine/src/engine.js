const {
  PLAYERS,
  PHASES,
  GAME_STATUS,
  ACTIONS,
  DEFAULT_RULES,
} = require("./constants");

const {
  createEmptyBoard,
  cloneBoard,
  isValidPosition,
  isEmpty,
  areConnected,
  getPlayerPositions,
  countPlayerPieces,
  getEmptyPositions,
  isMill,
  getCompletedMills,
  getPiecePositionsOutsideMills,
  getLegalAdjacentMoves,
  getAllAdjacentMoves,
  getAllFlyingMoves,
} = require("./board");

/*
|--------------------------------------------------------------------------
| Basic Helpers
|--------------------------------------------------------------------------
*/

function getOpponent(player) {
  if (player === PLAYERS.WHITE) return PLAYERS.BLACK;
  if (player === PLAYERS.BLACK) return PLAYERS.WHITE;

  throw new Error("INVALID_PLAYER");
}

function cloneState(state) {
  return {
    ...state,

    board: cloneBoard(state.board),

    piecesRemaining: {
      ...state.piecesRemaining,
    },

    piecesOnBoard: {
      ...state.piecesOnBoard,
    },

    clocks: state.clocks
      ? {
          ...state.clocks,
        }
      : undefined,

    lastMove: state.lastMove
      ? {
          ...state.lastMove,
        }
      : null,

    repetition: state.repetition
      ? {
          ...state.repetition,
        }
      : {},

    moveHistory: Array.isArray(state.moveHistory)
      ? state.moveHistory.map((move) => ({ ...move }))
      : [],
  };
}

/*
|--------------------------------------------------------------------------
| Initial State
|--------------------------------------------------------------------------
*/

function createInitialState(options = {}) {
  const rules = {
    ...DEFAULT_RULES,
    ...(options.rules || {}),
  };

  return {
    gameId: options.gameId || null,

    players: {
      white: options.whitePlayerId || null,
      black: options.blackPlayerId || null,
    },

    board: createEmptyBoard(),

    currentPlayer: PLAYERS.WHITE,

    phase: PHASES.PLACEMENT,

    status: GAME_STATUS.ACTIVE,

    winner: null,

    loser: null,

    piecesRemaining: {
      white: rules.piecesPerPlayer,
      black: rules.piecesPerPlayer,
    },

    piecesOnBoard: {
      white: 0,
      black: 0,
    },

    pendingCapture: false,

    moveNumber: 0,

    rules,

    timeControl: options.timeControl || null,

    clocks: options.clocks
      ? {
          ...options.clocks,
        }
      : null,

    lastMove: null,

    moveHistory: [],

    repetition: {},

    createdAt: options.createdAt || new Date().toISOString(),

    updatedAt: new Date().toISOString(),
  };
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

function assertActive(state) {
  if (state.status !== GAME_STATUS.ACTIVE) {
    throw new Error("GAME_NOT_ACTIVE");
  }
}

function assertPlayer(player) {
  if (player !== PLAYERS.WHITE && player !== PLAYERS.BLACK) {
    throw new Error("INVALID_PLAYER");
  }
}

function assertCurrentPlayer(state, player) {
  assertPlayer(player);

  if (state.currentPlayer !== player) {
    throw new Error("NOT_YOUR_TURN");
  }
}

/*
|--------------------------------------------------------------------------
| Phase
|--------------------------------------------------------------------------
*/

function getMoveCount(state) {
  return state.moveNumber;
}

function determinePhase(state) {
  const totalPiecesToPlace =
    state.rules.piecesPerPlayer * 2;

  const totalPiecesPlaced =
    state.piecesOnBoard.white +
    state.piecesOnBoard.black +
    state.piecesRemaining.white +
    state.piecesRemaining.black;

  /*
   * Placement continues while either player still has
   * pieces that have not yet been placed.
   */
  if (
    state.piecesRemaining.white > 0 ||
    state.piecesRemaining.black > 0
  ) {
    return PHASES.PLACEMENT;
  }

  return PHASES.MOVEMENT;
}

/*
|--------------------------------------------------------------------------
| Legal Moves
|--------------------------------------------------------------------------
*/

function getLegalMoves(state) {
  if (state.status !== GAME_STATUS.ACTIVE) {
    return [];
  }

  if (state.pendingCapture) {
    return getAvailableCaptureTargets(state).map(
      (position) => ({
        type: ACTIONS.CAPTURE,
        player: state.currentPlayer,
        position,
      })
    );
  }

  if (state.phase === PHASES.PLACEMENT) {
    return getEmptyPositions(state.board).map(
      (position) => ({
        type: ACTIONS.PLACE,
        player: state.currentPlayer,
        position,
      })
    );
  }

  const player = state.currentPlayer;

  const positions = getPlayerPositions(
    state.board,
    player
  );

  let moves = [];

  /*
   * Flying is allowed when the player has exactly
   * three pieces on the board.
   */
  if (
    state.rules.allowFlyingAtThree &&
    positions.length === 3
  ) {
    moves = getAllFlyingMoves(
      state.board,
      player
    );
  } else {
    moves = getAllAdjacentMoves(
      state.board,
      player
    );
  }

  return moves.map((move) => ({
    type: ACTIONS.MOVE,
    player,
    from: move.from,
    to: move.to,
  }));
}

function hasLegalMovement(state, player) {
  const positions = getPlayerPositions(
    state.board,
    player
  );

  if (positions.length < 3) {
    return false;
  }

  if (
    state.rules.allowFlyingAtThree &&
    positions.length === 3
  ) {
    return getAllFlyingMoves(
      state.board,
      player
    ).length > 0;
  }

  return getAllAdjacentMoves(
    state.board,
    player
  ).length > 0;
}

/*
|--------------------------------------------------------------------------
| Capture
|--------------------------------------------------------------------------
*/

function getAvailableCaptureTargets(state) {
  if (!state.pendingCapture) {
    return [];
  }

  const opponent = getOpponent(
    state.currentPlayer
  );

  const opponentPositions = getPlayerPositions(
    state.board,
    opponent
  );

  if (opponentPositions.length === 0) {
    return [];
  }

  /*
   * If the opponent has pieces outside mills,
   * those pieces must be captured first.
   */
  if (state.rules.protectMillsWhenPossible) {
    const outsideMillPositions =
      getPiecePositionsOutsideMills(
        state.board,
        opponent
      );

    if (outsideMillPositions.length > 0) {
      return outsideMillPositions;
    }
  }

  return opponentPositions;
}

/*
|--------------------------------------------------------------------------
| Draw
|--------------------------------------------------------------------------
*/

function createPositionKey(state) {
  return [
    JSON.stringify(state.board),
    state.currentPlayer,
    state.phase,
    state.pendingCapture ? "capture" : "normal",
  ].join("|");
}

function updateRepetition(state) {
  const key = createPositionKey(state);

  state.repetition[key] =
    (state.repetition[key] || 0) + 1;

  return state;
}

function checkDraw(state) {
  const repetitionLimit =
    state.rules.repetitionLimit || 0;

  if (
    repetitionLimit > 0 &&
    Object.values(state.repetition).some(
      (count) => count >= repetitionLimit
    )
  ) {
    return true;
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| Win Detection
|--------------------------------------------------------------------------
*/

function checkWinAfterMove(state) {
  if (state.phase !== PHASES.MOVEMENT) {
    return false;
  }

  const opponent = getOpponent(
    state.currentPlayer
  );

  const opponentPieces =
    countPlayerPieces(
      state.board,
      opponent
    );

  /*
   * A player loses when they have fewer than
   * three pieces.
   */
  if (opponentPieces < 3) {
    state.status = GAME_STATUS.FINISHED;
    state.winner = state.currentPlayer;
    state.loser = opponent;

    return true;
  }

  /*
   * A player also loses when they have no legal
   * movement available.
   */
  if (!hasLegalMovement(state, opponent)) {
    state.status = GAME_STATUS.FINISHED;
    state.winner = state.currentPlayer;
    state.loser = opponent;

    return true;
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| Turn Handling
|--------------------------------------------------------------------------
*/

function switchPlayer(state) {
  state.currentPlayer = getOpponent(
    state.currentPlayer
  );

  return state;
}

/*
|--------------------------------------------------------------------------
| Move History
|--------------------------------------------------------------------------
*/

function recordMove(
  state,
  move
) {
  state.moveHistory.push({
    ...move,
    moveNumber: state.moveNumber,
    timestamp: new Date().toISOString(),
  });

  state.lastMove = {
    ...move,
    moveNumber: state.moveNumber,
  };

  state.updatedAt =
    new Date().toISOString();

  return state;
}

/*
|--------------------------------------------------------------------------
| Placement
|--------------------------------------------------------------------------
*/

function placePiece(
  originalState,
  player,
  position
) {
  const state = cloneState(
    originalState
  );

  assertActive(state);
  assertCurrentPlayer(
    state,
    player
  );

  if (
    state.phase !== PHASES.PLACEMENT
  ) {
    throw new Error(
      "PLACEMENT_PHASE_FINISHED"
    );
  }

  if (!isValidPosition(position)) {
    throw new Error(
      "INVALID_POSITION"
    );
  }

  if (!isEmpty(state.board, position)) {
    throw new Error(
      "POSITION_OCCUPIED"
    );
  }

  if (
    state.piecesRemaining[player] <= 0
  ) {
    throw new Error(
      "NO_PIECES_REMAINING"
    );
  }

  state.board[position] = player;

  state.piecesRemaining[player] -= 1;

  state.piecesOnBoard[player] += 1;

  state.moveNumber += 1;

  const formedMill = isMill(
    state.board,
    position,
    player
  );

  state.pendingCapture = formedMill;

  state.phase = determinePhase(state);

  recordMove(state, {
    type: ACTIONS.PLACE,
    player,
    position,
    formedMill,
  });

  /*
   * If a mill was formed, the same player
   * gets to capture.
   */
  if (formedMill) {
    updateRepetition(state);
    return state;
  }

  /*
   * If placement is complete, switch into movement.
   */
  if (
    state.phase === PHASES.MOVEMENT
  ) {
    state.phase = PHASES.MOVEMENT;
  }

  switchPlayer(state);

  updateRepetition(state);

  return state;
}

/*
|--------------------------------------------------------------------------
| Movement
|--------------------------------------------------------------------------
*/

function movePiece(
  originalState,
  player,
  from,
  to
) {
  const state = cloneState(
    originalState
  );

  assertActive(state);
  assertCurrentPlayer(
    state,
    player
  );

  if (
    state.phase !== PHASES.MOVEMENT
  ) {
    throw new Error(
      "MOVEMENT_PHASE_REQUIRED"
    );
  }

  if (
    !isValidPosition(from) ||
    !isValidPosition(to)
  ) {
    throw new Error(
      "INVALID_POSITION"
    );
  }

  if (isEmpty(state.board, from)) {
    throw new Error(
      "SOURCE_EMPTY"
    );
  }

  if (
    state.board[from] !== player
  ) {
    throw new Error(
      "NOT_YOUR_PIECE"
    );
  }

  if (!isEmpty(state.board, to)) {
    throw new Error(
      "DESTINATION_OCCUPIED"
    );
  }

  const playerPositions =
    getPlayerPositions(
      state.board,
      player
    );

  const canFly =
    state.rules.allowFlyingAtThree &&
    playerPositions.length === 3;

  const legalDestination = canFly
    ? true
    : areConnected(from, to);

  if (!legalDestination) {
    throw new Error(
      "POSITIONS_NOT_CONNECTED"
    );
  }

  state.board[from] = null;
  state.board[to] = player;

  state.moveNumber += 1;

  const formedMill = isMill(
    state.board,
    to,
    player
  );

  state.pendingCapture = formedMill;

  recordMove(state, {
    type: ACTIONS.MOVE,
    player,
    from,
    to,
    formedMill,
  });

  if (formedMill) {
    updateRepetition(state);
    return state;
  }

  /*
   * Check whether the opponent has lost.
   */
  if (!checkWinAfterMove(state)) {
    switchPlayer(state);
  }

  updateRepetition(state);

  if (
    state.status === GAME_STATUS.ACTIVE &&
    checkDraw(state)
  ) {
    state.status = GAME_STATUS.DRAW;
    state.winner = null;
    state.loser = null;
  }

  return state;
}

/*
|--------------------------------------------------------------------------
| Capture Piece
|--------------------------------------------------------------------------
*/

function capturePiece(
  originalState,
  player,
  position
) {
  const state = cloneState(
    originalState
  );

  assertActive(state);
  assertCurrentPlayer(
    state,
    player
  );

  if (!state.pendingCapture) {
    throw new Error(
      "CAPTURE_NOT_ALLOWED"
    );
  }

  if (!isValidPosition(position)) {
    throw new Error(
      "INVALID_POSITION"
    );
  }

  const opponent = getOpponent(player);

  if (
    state.board[position] !== opponent
  ) {
    throw new Error(
      "INVALID_CAPTURE_TARGET"
    );
  }

  const availableTargets =
    getAvailableCaptureTargets(state);

  if (
    !availableTargets.includes(position)
  ) {
    throw new Error(
      "PROTECTED_MILL"
    );
  }

  state.board[position] = null;

  state.piecesOnBoard[opponent] -= 1;

  state.pendingCapture = false;

  state.moveNumber += 1;

  recordMove(state, {
    type: ACTIONS.CAPTURE,
    player,
    position,
    capturedPlayer: opponent,
  });

  /*
   * Capturing can immediately win the game.
   */
  if (
    state.phase === PHASES.MOVEMENT &&
    state.piecesOnBoard[opponent] < 3
  ) {
    state.status = GAME_STATUS.FINISHED;
    state.winner = player;
    state.loser = opponent;

    updateRepetition(state);

    return state;
  }

  switchPlayer(state);

  updateRepetition(state);

  return state;
}

/*
|--------------------------------------------------------------------------
| Resignation
|--------------------------------------------------------------------------
*/

function resignGame(
  originalState,
  player
) {
  const state = cloneState(
    originalState
  );

  assertActive(state);
  assertCurrentPlayer(
    state,
    player
  );

  const opponent = getOpponent(player);

  state.status =
    GAME_STATUS.FINISHED;

  state.winner = opponent;
  state.loser = player;

  state.moveNumber += 1;

  recordMove(state, {
    type: ACTIONS.RESIGN,
    player,
  });

  return state;
}

/*
|--------------------------------------------------------------------------
| Main Action Dispatcher
|--------------------------------------------------------------------------
*/

function applyAction(
  state,
  action
) {
  if (!action || !action.type) {
    throw new Error(
      "INVALID_ACTION"
    );
  }

  switch (action.type) {
    case ACTIONS.PLACE:
      return placePiece(
        state,
        action.player,
        action.position
      );

    case ACTIONS.MOVE:
      return movePiece(
        state,
        action.player,
        action.from,
        action.to
      );

    case ACTIONS.CAPTURE:
      return capturePiece(
        state,
        action.player,
        action.position
      );

    case ACTIONS.RESIGN:
      return resignGame(
        state,
        action.player
      );

    default:
      throw new Error(
        "UNKNOWN_ACTION"
      );
  }
}

/*
|--------------------------------------------------------------------------
| Game Summary
|--------------------------------------------------------------------------
*/

function getGameSummary(state) {
  return {
    gameId: state.gameId,

    whitePlayerId:
      state.players?.white || null,

    blackPlayerId:
      state.players?.black || null,

    currentPlayer:
      state.currentPlayer,

    phase:
      state.phase,

    status:
      state.status,

    winner:
      state.winner,

    loser:
      state.loser,

    piecesRemaining: {
      ...state.piecesRemaining,
    },

    piecesOnBoard: {
      ...state.piecesOnBoard,
    },

    pendingCapture:
      state.pendingCapture,

    moveNumber:
      state.moveNumber,

    lastMove:
      state.lastMove
        ? {
            ...state.lastMove,
          }
        : null,
  };
}

/*
|--------------------------------------------------------------------------
| Events
|--------------------------------------------------------------------------
*/

function getGameEvents(
  previousState,
  nextState
) {
  const events = [];

  if (
    previousState.phase !==
    nextState.phase
  ) {
    events.push({
      type: "PHASE_CHANGED",
      phase: nextState.phase,
    });
  }

  if (
    !previousState.pendingCapture &&
    nextState.pendingCapture
  ) {
    events.push({
      type: "CAPTURE_REQUIRED",
      player:
        nextState.currentPlayer,
    });
  }

  if (
    previousState.status ===
      GAME_STATUS.ACTIVE &&
    nextState.status !==
      GAME_STATUS.ACTIVE
  ) {
    events.push({
      type: "GAME_FINISHED",
      status: nextState.status,
      winner: nextState.winner,
      loser: nextState.loser,
    });
  }

  if (
    previousState.currentPlayer !==
      nextState.currentPlayer &&
    nextState.status ===
      GAME_STATUS.ACTIVE
  ) {
    events.push({
      type: "TURN_CHANGED",
      player:
        nextState.currentPlayer,
    });
  }

  return events;
}

module.exports = {
  getOpponent,
  createInitialState,
  cloneState,
  assertActive,
  assertPlayer,
  assertCurrentPlayer,
  getMoveCount,
  determinePhase,
  getAvailableCaptureTargets,
  getLegalMoves,
  hasLegalMovement,
  checkDraw,
  checkWinAfterMove,
  createPositionKey,
  updateRepetition,
  switchPlayer,
  recordMove,
  placePiece,
  movePiece,
  capturePiece,
  resignGame,
  applyAction,
  getGameSummary,
  getGameEvents,
};