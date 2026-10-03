const crypto = require("crypto");

const repository = require("./lobby.repository");
const {
  getOrCreateUser,
  findUserById,
  findUserByUsername,
} = require("./user.service");

const {
  createGame,
} = require("./game.service");

const {
  pool,
} = require("../config/database");

const COLOR_VALUES = [
  "white",
  "black",
  "random",
];

const TIME_CONTROLS = [
  null,
  60,
  180,
  300,
  600,
  900,
  1800,
];

function generateGameId() {
  return crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase();
}

function validateColorPreference(color) {
  if (!COLOR_VALUES.includes(color)) {
    throw new Error(
      "Color preference must be white, black, or random."
    );
  }
}

function validateTimeControl(seconds) {
  if (
    seconds !== null &&
    seconds !== undefined &&
    !TIME_CONTROLS.includes(Number(seconds))
  ) {
    throw new Error("Invalid time control.");
  }
}

function resolveColors(
  creatorColor,
  creatorClerkUserId,
  opponentClerkUserId
) {
  if (creatorColor === "white") {
    return {
      whitePlayerId: creatorClerkUserId,
      blackPlayerId: opponentClerkUserId,
    };
  }

  if (creatorColor === "black") {
    return {
      whitePlayerId: opponentClerkUserId,
      blackPlayerId: creatorClerkUserId,
    };
  }

  if (Math.random() >= 0.5) {
    return {
      whitePlayerId: creatorClerkUserId,
      blackPlayerId: opponentClerkUserId,
    };
  }

  return {
    whitePlayerId: opponentClerkUserId,
    blackPlayerId: creatorClerkUserId,
  };
}

async function createChallenge({
  challengerClerkUserId,
  challengedClerkUserId,
  colorPreference = "random",
  timeControlSeconds = null,
}) {
  if (
    challengerClerkUserId ===
    challengedClerkUserId
  ) {
    const error = new Error(
      "You cannot challenge yourself."
    );

    error.code = "SELF_CHALLENGE";

    throw error;
  }

  validateColorPreference(colorPreference);
  validateTimeControl(timeControlSeconds);

  const challenger = await getOrCreateUser(
    challengerClerkUserId
  );

  let challenged;

  try {
    challenged = await getOrCreateUser(
      challengedClerkUserId
    );
  } catch (error) {
    error.code =
      error.code || "OPPONENT_NOT_FOUND";

    throw error;
  }

  const existing =
    await repository.findPendingChallengeBetween(
      challenger.id,
      challenged.id
    );

  if (existing) {
    const error = new Error(
      "A challenge is already pending."
    );

    error.code = "CHALLENGE_EXISTS";

    throw error;
  }

  return repository.createChallenge({
    challengerUserId: challenger.id,
    challengedUserId: challenged.id,
    colorPreference,
    timeControlSeconds,
  });
}

async function acceptChallenge(
  challengeId,
  acceptingClerkUserId
) {
  const challenge =
    await repository.findChallengeById(
      challengeId
    );

  if (!challenge) {
    const error = new Error(
      "Challenge not found."
    );

    error.code = "CHALLENGE_NOT_FOUND";

    throw error;
  }

  if (
    challenge.challenged_user_id !==
    (await getOrCreateUser(
      acceptingClerkUserId
    )).id
  ) {
    const error = new Error(
      "You cannot accept this challenge."
    );

    error.code = "FORBIDDEN";

    throw error;
  }

  if (challenge.status !== "pending") {
    const error = new Error(
      "This challenge is no longer pending."
    );

    error.code = "CHALLENGE_NOT_PENDING";

    throw error;
  }

  const challenger =
    await findUserById(
      challenge.challenger_user_id
    );

  const challenged =
    await findUserById(
      challenge.challenged_user_id
    );

  const creatorColor =
    challenge.color_preference === "random"
      ? "random"
      : challenge.color_preference;

  const colors = resolveColors(
    creatorColor,
    challenger.clerk_user_id,
    challenged.clerk_user_id
  );

  const game = await createGame({
    gameId: generateGameId(),
    creatorClerkUserId:
      challenger.clerk_user_id,
    opponentClerkUserId:
      challenged.clerk_user_id,
    creatorColor:
      challenge.color_preference === "random"
        ? "random"
        : challenge.color_preference,
    timeControl:
      challenge.time_control_seconds,
    gameType: "friend",
  });

  const gameRecord =
    await findGameDatabaseRecord(
      game.gameId
    );

  await repository.attachGameToChallenge(
    challengeId,
    gameRecord.id
  );

  return {
    challengeId,
    game,
    challenger,
    challenged,
    colors,
  };
}

async function declineChallenge(
  challengeId,
  clerkUserId
) {
  const user =
    await getOrCreateUser(clerkUserId);

  const challenge =
    await repository.findChallengeById(
      challengeId
    );

  if (!challenge) {
    const error = new Error(
      "Challenge not found."
    );

    error.code = "CHALLENGE_NOT_FOUND";

    throw error;
  }

  if (
    challenge.challenged_user_id !== user.id
  ) {
    const error = new Error(
      "You cannot decline this challenge."
    );

    error.code = "FORBIDDEN";

    throw error;
  }

  if (challenge.status !== "pending") {
    throw new Error(
      "This challenge is no longer pending."
    );
  }

  return repository.updateChallengeStatus(
    challengeId,
    "declined"
  );
}

async function cancelChallenge(
  challengeId,
  clerkUserId
) {
  const user =
    await getOrCreateUser(clerkUserId);

  const challenge =
    await repository.findChallengeById(
      challengeId
    );

  if (!challenge) {
    const error = new Error(
      "Challenge not found."
    );

    error.code = "CHALLENGE_NOT_FOUND";

    throw error;
  }

  if (
    challenge.challenger_user_id !== user.id
  ) {
    const error = new Error(
      "You cannot cancel this challenge."
    );

    error.code = "FORBIDDEN";

    throw error;
  }

  if (challenge.status !== "pending") {
    throw new Error(
      "This challenge is no longer pending."
    );
  }

  return repository.updateChallengeStatus(
    challengeId,
    "cancelled"
  );
}

async function getLobbyData(clerkUserId) {
  const user =
    await getOrCreateUser(clerkUserId);

  const [
    incomingChallenges,
    outgoingChallenges,
    activeGames,
    queue,
  ] = await Promise.all([
    repository.listIncomingChallenges(user.id),
    repository.listOutgoingChallenges(user.id),
    repository.listActiveGames(user.id),
    repository.getQueueEntry(user.id),
  ]);

  return {
    user,
    incomingChallenges,
    outgoingChallenges,
    activeGames,
    queue,
  };
}

async function searchPlayers(
  clerkUserId,
  query
) {
  const currentUser =
    await getOrCreateUser(clerkUserId);

  const search = String(query || "")
    .trim()
    .slice(0, 30);

  if (search.length < 2) {
    return [];
  }

  const result = await pool.query(
    `
      SELECT
        u.id,
        u.clerk_user_id,
        u.username,
        u.display_name,
        u.country,
        u.avatar_url,
        r.rating,
        r.games_played,
        r.wins,
        r.losses,
        r.draws
      FROM users u
      LEFT JOIN ratings r
        ON r.user_id = u.id
      WHERE u.id <> $1
        AND (
          u.username ILIKE $2
          OR u.display_name ILIKE $2
        )
      ORDER BY
        CASE
          WHEN LOWER(u.username) = LOWER($3)
          THEN 0
          ELSE 1
        END,
        u.username
      LIMIT 20
    `,
    [
      currentUser.id,
      `%${search}%`,
      search,
    ]
  );

  return result.rows;
}

async function joinMatchmaking({
  clerkUserId,
  timeControlSeconds = null,
  colorPreference = "random",
}) {
  validateColorPreference(colorPreference);
  validateTimeControl(timeControlSeconds);

  const user =
    await getOrCreateUser(clerkUserId);

  const ratingResult = await pool.query(
    `
      SELECT rating
      FROM ratings
      WHERE user_id = $1
      LIMIT 1
    `,
    [user.id]
  );

  const rating =
    ratingResult.rows[0]?.rating || 1200;

  const queue =
    await repository.addToMatchmaking({
      userId: user.id,
      rating,
      searchRange: 100,
      timeControlSeconds,
      colorPreference,
    });

  const match =
    await findAndCreateMatch(user);

  return {
    queue,
    match,
  };
}

async function findAndCreateMatch(user) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentQueue =
      await repository.getQueueEntry(user.id);

    if (!currentQueue) {
      await client.query("COMMIT");

      return null;
    }

    const candidate =
      await repository.findMatchCandidate({
        userId: user.id,
        rating: currentQueue.rating,
        searchRange: currentQueue.search_range,
        timeControlSeconds:
          currentQueue.time_control_seconds,
        colorPreference:
          currentQueue.color_preference,
      });

    if (!candidate) {
      await client.query("COMMIT");

      return null;
    }

    await repository.markMatched(
      user.id,
      candidate.user_id
    );

    const firstUser =
      await findUserById(user.id);

    const secondUser =
      await findUserById(candidate.user_id);

    const firstColor =
      chooseMatchColor(
        currentQueue.color_preference,
        candidate.color_preference
      );

    const game =
      await createGame({
        gameId: generateGameId(),
        creatorClerkUserId:
          firstUser.clerk_user_id,
        opponentClerkUserId:
          secondUser.clerk_user_id,
        creatorColor: firstColor,
        timeControl:
          currentQueue.time_control_seconds,
        gameType: "rated",
      });

    const gameRecord =
      await findGameDatabaseRecord(
        game.gameId
      );

    await repository.clearMatchedUsers(
      user.id,
      candidate.user_id
    );

    await client.query("COMMIT");

    return {
      game,
      firstUser,
      secondUser,
      gameRecord,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function chooseMatchColor(
  firstPreference,
  secondPreference
) {
  if (
    firstPreference === "white" &&
    secondPreference !== "white"
  ) {
    return "white";
  }

  if (
    firstPreference === "black" &&
    secondPreference !== "black"
  ) {
    return "black";
  }

  if (
    secondPreference === "white" &&
    firstPreference !== "white"
  ) {
    return "black";
  }

  if (
    secondPreference === "black" &&
    firstPreference !== "black"
  ) {
    return "white";
  }

  return Math.random() >= 0.5
    ? "white"
    : "black";
}

async function leaveMatchmaking(
  clerkUserId
) {
  const user =
    await getOrCreateUser(clerkUserId);

  await repository.removeFromMatchmaking(
    user.id
  );

  return {
    cancelled: true,
  };
}

async function findGameDatabaseRecord(
  publicGameId
) {
  const result = await pool.query(
    `
      SELECT *
      FROM games
      WHERE public_id = $1
      LIMIT 1
    `,
    [publicGameId]
  );

  if (!result.rows[0]) {
    throw new Error(
      "Created game could not be found."
    );
  }

  return result.rows[0];
}

module.exports = {
  createChallenge,
  acceptChallenge,
  declineChallenge,
  cancelChallenge,
  getLobbyData,
  searchPlayers,
  joinMatchmaking,
  leaveMatchmaking,
};