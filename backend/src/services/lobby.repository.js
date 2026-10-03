const { pool } = require("../config/database");

async function createChallenge({
  challengerUserId,
  challengedUserId,
  colorPreference,
  timeControlSeconds,
}) {
  const result = await pool.query(
    `
      INSERT INTO game_challenges (
        challenger_user_id,
        challenged_user_id,
        color_preference,
        time_control_seconds
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      challengerUserId,
      challengedUserId,
      colorPreference,
      timeControlSeconds,
    ]
  );

  return result.rows[0];
}

async function findChallengeById(id) {
  const result = await pool.query(
    `
      SELECT
        c.*,

        challenger.username AS challenger_username,
        challenger.display_name AS challenger_display_name,
        challenger.avatar_url AS challenger_avatar_url,

        challenged.username AS challenged_username,
        challenged.display_name AS challenged_display_name,
        challenged.avatar_url AS challenged_avatar_url,

        cr.rating AS challenger_rating,
        dr.rating AS challenged_rating

      FROM game_challenges c

      JOIN users challenger
        ON challenger.id = c.challenger_user_id

      JOIN users challenged
        ON challenged.id = c.challenged_user_id

      LEFT JOIN ratings cr
        ON cr.user_id = challenger.id

      LEFT JOIN ratings dr
        ON dr.user_id = challenged.id

      WHERE c.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function findPendingChallengeBetween(
  challengerUserId,
  challengedUserId
) {
  const result = await pool.query(
    `
      SELECT *
      FROM game_challenges
      WHERE challenger_user_id = $1
        AND challenged_user_id = $2
        AND status = 'pending'
      LIMIT 1
    `,
    [
      challengerUserId,
      challengedUserId,
    ]
  );

  return result.rows[0] || null;
}

async function listIncomingChallenges(userId) {
  const result = await pool.query(
    `
      SELECT
        c.*,
        u.username,
        u.display_name,
        u.avatar_url,
        r.rating
      FROM game_challenges c
      JOIN users u
        ON u.id = c.challenger_user_id
      LEFT JOIN ratings r
        ON r.user_id = u.id
      WHERE c.challenged_user_id = $1
        AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

async function listOutgoingChallenges(userId) {
  const result = await pool.query(
    `
      SELECT
        c.*,
        u.username,
        u.display_name,
        u.avatar_url,
        r.rating
      FROM game_challenges c
      JOIN users u
        ON u.id = c.challenged_user_id
      LEFT JOIN ratings r
        ON r.user_id = u.id
      WHERE c.challenger_user_id = $1
        AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

async function updateChallengeStatus(
  challengeId,
  status
) {
  const result = await pool.query(
    `
      UPDATE game_challenges
      SET
        status = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [challengeId, status]
  );

  return result.rows[0] || null;
}

async function attachGameToChallenge(
  challengeId,
  gameDbId
) {
  const result = await pool.query(
    `
      UPDATE game_challenges
      SET
        game_id = $2,
        status = 'accepted',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [challengeId, gameDbId]
  );

  return result.rows[0] || null;
}

async function addToMatchmaking({
  userId,
  rating,
  searchRange,
  timeControlSeconds,
  colorPreference,
}) {
  const result = await pool.query(
    `
      INSERT INTO matchmaking_queue (
        user_id,
        rating,
        search_range,
        time_control_seconds,
        color_preference,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'searching')
      ON CONFLICT (user_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        search_range = EXCLUDED.search_range,
        time_control_seconds = EXCLUDED.time_control_seconds,
        color_preference = EXCLUDED.color_preference,
        status = 'searching',
        joined_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      rating,
      searchRange,
      timeControlSeconds,
      colorPreference,
    ]
  );

  return result.rows[0];
}

async function removeFromMatchmaking(userId) {
  await pool.query(
    `
      DELETE FROM matchmaking_queue
      WHERE user_id = $1
    `,
    [userId]
  );
}

async function getQueueEntry(userId) {
  const result = await pool.query(
    `
      SELECT *
      FROM matchmaking_queue
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function findMatchCandidate({
  userId,
  rating,
  searchRange,
  timeControlSeconds,
  colorPreference,
}) {
  const result = await pool.query(
    `
      SELECT *
      FROM matchmaking_queue
      WHERE status = 'searching'
        AND user_id <> $1
        AND ABS(rating - $2) <= $3
        AND (
          $4::INTEGER IS NULL
          OR time_control_seconds = $4
        )
        AND (
          color_preference = 'random'
          OR $5 = 'random'
          OR color_preference <> $5
        )
      ORDER BY
        ABS(rating - $2) ASC,
        joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `,
    [
      userId,
      rating,
      searchRange,
      timeControlSeconds,
      colorPreference,
    ]
  );

  return result.rows[0] || null;
}

async function markMatched(
  firstUserId,
  secondUserId
) {
  await pool.query(
    `
      UPDATE matchmaking_queue
      SET
        status = 'matched',
        updated_at = NOW()
      WHERE user_id IN ($1, $2)
    `,
    [firstUserId, secondUserId]
  );
}

async function clearMatchedUsers(
  firstUserId,
  secondUserId
) {
  await pool.query(
    `
      DELETE FROM matchmaking_queue
      WHERE user_id IN ($1, $2)
    `,
    [firstUserId, secondUserId]
  );
}

async function listActiveGames(userId) {
  const result = await pool.query(
    `
      SELECT
        g.id,
        g.public_id,
        g.game_type,
        g.status,
        g.phase,
        g.current_player,
        g.move_number,
        g.time_control_seconds,
        g.player_one_time_ms,
        g.player_two_time_ms,
        g.winner_user_id,
        g.result_reason,
        g.created_at,
        g.updated_at,

        me.player_number AS my_player_number,
        me.color AS my_color,

        opponent.id AS opponent_id,
        opponent.username AS opponent_username,
        opponent.display_name AS opponent_display_name,
        opponent.avatar_url AS opponent_avatar_url,

        opponent_rating.rating AS opponent_rating

      FROM games g

      JOIN game_players me
        ON me.game_id = g.id
       AND me.user_id = $1

      JOIN game_players other_player
        ON other_player.game_id = g.id
       AND other_player.user_id <> $1

      JOIN users opponent
        ON opponent.id = other_player.user_id

      LEFT JOIN ratings opponent_rating
        ON opponent_rating.user_id = opponent.id

      WHERE g.status IN ('waiting', 'active')
      ORDER BY g.updated_at DESC
    `,
    [userId]
  );

  return result.rows;
}

module.exports = {
  createChallenge,
  findChallengeById,
  findPendingChallengeBetween,
  listIncomingChallenges,
  listOutgoingChallenges,
  updateChallengeStatus,
  attachGameToChallenge,

  addToMatchmaking,
  removeFromMatchmaking,
  getQueueEntry,
  findMatchCandidate,
  markMatched,
  clearMatchedUsers,

  listActiveGames,
};