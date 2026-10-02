const {
  POSITIONS,
  CONNECTIONS,
  MILLS
} = require("./constants");

function createEmptyBoard() {
  const board = {};

  for (const position of POSITIONS) {
    board[position] = null;
  }

  return board;
}

function cloneBoard(board) {
  const cloned = {};

  for (const position of POSITIONS) {
    cloned[position] = board[position] || null;
  }

  return cloned;
}

function isValidPosition(position) {
  return Number.isInteger(position) && POSITIONS.includes(position);
}

function isEmpty(board, position) {
  return isValidPosition(position) && board[position] === null;
}

function getConnectedPositions(position) {
  if (!isValidPosition(position)) {
    return [];
  }

  return [...CONNECTIONS[position]];
}

function areConnected(positionA, positionB) {
  if (
    !isValidPosition(positionA) ||
    !isValidPosition(positionB)
  ) {
    return false;
  }

  return CONNECTIONS[positionA].includes(positionB);
}

function getPlayerPositions(board, player) {
  return POSITIONS.filter(
    (position) => board[position] === player
  );
}

function countPlayerPieces(board, player) {
  return getPlayerPositions(board, player).length;
}

function getEmptyPositions(board) {
  return POSITIONS.filter(
    (position) => board[position] === null
  );
}

function getLinesContainingPosition(position) {
  return MILLS.filter((line) =>
    line.includes(position)
  );
}

function isMill(board, position, player) {
  if (!isValidPosition(position)) {
    return false;
  }

  if (board[position] !== player) {
    return false;
  }

  const lines = getLinesContainingPosition(position);

  return lines.some((line) =>
    line.every((linePosition) => board[linePosition] === player)
  );
}

function getCompletedMills(board, player) {
  return MILLS.filter((line) =>
    line.every((position) => board[position] === player)
  );
}

function getMillsContainingPosition(board, position, player) {
  return getCompletedMills(board, player).filter((line) =>
    line.includes(position)
  );
}

function getLegalAdjacentMoves(board, position, player) {
  if (!isValidPosition(position)) {
    return [];
  }

  if (board[position] !== player) {
    return [];
  }

  return CONNECTIONS[position].filter(
    (destination) => board[destination] === null
  );
}

function getAllAdjacentMoves(board, player) {
  const moves = [];

  for (const from of getPlayerPositions(board, player)) {
    for (const to of getLegalAdjacentMoves(board, from, player)) {
      moves.push({
        from,
        to
      });
    }
  }

  return moves;
}

function getAllFlyingMoves(board, player) {
  const moves = [];
  const playerPositions = getPlayerPositions(board, player);
  const emptyPositions = getEmptyPositions(board);

  for (const from of playerPositions) {
    for (const to of emptyPositions) {
      moves.push({
        from,
        to
      });
    }
  }

  return moves;
}

function getPiecePositionsOutsideMills(board, player) {
  return getPlayerPositions(board, player).filter(
    (position) => !isMill(board, position, player)
  );
}

function serializeBoard(board) {
  return POSITIONS.map(
    (position) => board[position] || "-"
  ).join("");
}

module.exports = {
  createEmptyBoard,
  cloneBoard,
  isValidPosition,
  isEmpty,
  getConnectedPositions,
  areConnected,
  getPlayerPositions,
  countPlayerPieces,
  getEmptyPositions,
  getLinesContainingPosition,
  isMill,
  getCompletedMills,
  getMillsContainingPosition,
  getLegalAdjacentMoves,
  getAllAdjacentMoves,
  getAllFlyingMoves,
  getPiecePositionsOutsideMills,
  serializeBoard
};