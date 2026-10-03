const {
  createClerkClient,
} = require("@clerk/backend");

const {
  pool,
} = require("../config/database");

const env =
  require("../config/env");

const clerkClient =
  createClerkClient({
    secretKey:
      env.clerkSecretKey,
  });

/*
 * Normalize usernames so they conform
 * to Align It's username rules.
 */
function normalizeUsername(username) {
  if (
    typeof username !== "string"
  ) {
    return null;
  }

  const normalized =
    username
      .trim()
      .replace(
        /[^a-zA-Z0-9_]/g,
        "_"
      )
      .slice(0, 20);

  if (
    normalized.length < 3
  ) {
    return null;
  }

  return normalized;
}

/*
 * Generate a deterministic fallback
 * username when Clerk does not have one.
 */
function generateFallbackUsername(
  clerkUserId
) {
  const suffix =
    clerkUserId
      .replace(
        /[^a-zA-Z0-9]/g,
        ""
      )
      .slice(-10);

  return `align_${suffix}`.slice(
    0,
    20
  );
}

/*
 * Get the primary email address from Clerk.
 */
function getPrimaryEmail(
  clerkUser
) {
  const email =
    clerkUser.emailAddresses?.find(
      (item) =>
        item.id ===
        clerkUser.primaryEmailAddressId
    );

  return (
    email?.emailAddress ||
    null
  );
}

/*
 * Build a username from Clerk data.
 */
function buildUsername(
  clerkUser
) {
  const primaryEmail =
    getPrimaryEmail(
      clerkUser
    );

  const emailUsername =
    primaryEmail
      ? primaryEmail.split("@")[0]
      : null;

  return (
    normalizeUsername(
      clerkUser.username
    ) ||
    normalizeUsername(
      emailUsername
    ) ||
    generateFallbackUsername(
      clerkUser.id
    )
  );
}

/*
 * Build a display name from Clerk.
 */
function buildDisplayName(
  clerkUser
) {
  const fullName =
    [
      clerkUser.firstName,
      clerkUser.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return (
    fullName ||
    clerkUser.username ||
    buildUsername(clerkUser)
  );
}

/*
 * Verify that the Clerk user actually exists.
 */
async function verifyClerkUser(
  clerkUserId
) {
  if (!clerkUserId) {
    throw new Error(
      "Clerk user ID is required."
    );
  }

  try {
    const clerkUser =
      await clerkClient.users.getUser(
        clerkUserId
      );

    if (!clerkUser) {
      throw new Error(
        "Clerk user was not found."
      );
    }

    return clerkUser;
  } catch (error) {
    console.error(
      "[CLERK] Failed to verify user:",
      error.message
    );

    const verificationError =
      new Error(
        "The specified Clerk user does not exist."
      );

    verificationError.code =
      "CLERK_USER_NOT_FOUND";

    throw verificationError;
  }
}

/*
 * Find an Align It user by Clerk ID.
 *
 * IMPORTANT:
 * Only query columns that actually
 * exist in the current database schema.
 */
async function findUserByClerkId(
  clerkUserId
) {
  const result =
    await pool.query(
      `
        SELECT
          u.*,

          p.bio,
          p.games_played,
          p.wins,
          p.losses,
          p.draws,

          r.rating,
          r.highest_rating,
          r.games_played AS rating_games_played,
          r.wins AS rating_wins,
          r.losses AS rating_losses,
          r.draws AS rating_draws

        FROM users u

        LEFT JOIN profiles p
          ON p.user_id = u.id

        LEFT JOIN ratings r
          ON r.user_id = u.id

        WHERE u.clerk_user_id = $1

        LIMIT 1;
      `,
      [clerkUserId]
    );

  return (
    result.rows[0] ||
    null
  );
}

/*
 * Find user by Neon UUID.
 */
async function findUserById(
  userId
) {
  const result =
    await pool.query(
      `
        SELECT *
        FROM users
        WHERE id = $1
        LIMIT 1;
      `,
      [userId]
    );

  return (
    result.rows[0] ||
    null
  );
}

/*
 * Find user by username.
 */
async function findUserByUsername(username) {
  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1;
    `,
    [username]
  );

  return result.rows[0] || null;
}

/*
 * Create an Align It user from
 * an already verified Clerk user.
 */
async function createUser({
  clerkUserId,
  username,
  displayName,
  country = null,
  avatarUrl = null,
}) {
  /*
   * Verify through Clerk first.
   */
  const clerkUser =
    await verifyClerkUser(
      clerkUserId
    );

  const finalUsername =
    normalizeUsername(username) ||
    buildUsername(clerkUser);

  const finalDisplayName =
    displayName?.trim() ||
    buildDisplayName(clerkUser);

  const finalAvatarUrl =
    avatarUrl ||
    clerkUser.imageUrl ||
    null;

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    /*
     * Create user.
     */
    const userResult =
      await client.query(
        `
          INSERT INTO users (
            clerk_user_id,
            username,
            display_name,
            country,
            avatar_url
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          RETURNING *;
        `,
        [
          clerkUserId,
          finalUsername,
          finalDisplayName,
          country,
          finalAvatarUrl,
        ]
      );

    const user =
      userResult.rows[0];

    /*
     * Create default profile.
     *
     * We intentionally only provide
     * user_id and allow database defaults
     * to handle the other columns.
     */
    await client.query(
      `
        INSERT INTO profiles (
          user_id
        )
        VALUES ($1)
        ON CONFLICT (user_id)
        DO NOTHING;
      `,
      [user.id]
    );

    /*
     * Create default rating.
     *
     * Database defaults should provide
     * the starting rating and statistics.
     */
    await client.query(
      `
        INSERT INTO ratings (
          user_id
        )
        VALUES ($1)
        ON CONFLICT (user_id)
        DO NOTHING;
      `,
      [user.id]
    );

    await client.query(
      "COMMIT"
    );

    /*
     * Return the complete user object,
     * including profile and rating data.
     */
    return findUserByClerkId(
      clerkUserId
    );
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

/*
 * Get the Align It user.
 *
 * If the user doesn't exist yet,
 * synchronize them from Clerk.
 */
async function getOrCreateUser(
  clerkUserId
) {
  const existingUser =
    await findUserByClerkId(
      clerkUserId
    );

  if (existingUser) {
    return existingUser;
  }

  const clerkUser =
    await verifyClerkUser(
      clerkUserId
    );

  const username =
    buildUsername(
      clerkUser
    );

  /*
   * Prevent username collisions.
   */
  let finalUsername =
    username;

  const usernameOwner =
    await findUserByUsername(
      finalUsername
    );

  if (
    usernameOwner &&
    usernameOwner.clerk_user_id !==
      clerkUserId
  ) {
    finalUsername =
      generateFallbackUsername(
        clerkUserId
      );
  }

  return createUser({
    clerkUserId,
    username:
      finalUsername,
    displayName:
      buildDisplayName(
        clerkUser
      ),
    avatarUrl:
      clerkUser.imageUrl ||
      null,
  });
}

/*
 * Used by /api/users/me.
 */
async function getCurrentUser(
  clerkUserId
) {
  return getOrCreateUser(
    clerkUserId
  );
}

/*
 * Update an existing Align It user.
 */
async function updateUser(
  userId,
  updates
) {
  const allowedFields = [
    "username",
    "displayName",
    "country",
    "avatarUrl",
  ];

  const fields = [];
  const values = [];

  for (
    const field of allowedFields
  ) {
    if (
      updates[field] !==
      undefined
    ) {
      fields.push(field);
      values.push(
        updates[field]
      );
    }
  }

  if (!fields.length) {
    return findUserById(
      userId
    );
  }

  const columnMap = {
    username:
      "username",

    displayName:
      "display_name",

    country:
      "country",

    avatarUrl:
      "avatar_url",
  };

  const setClauses =
    fields.map(
      (field, index) =>
        `${columnMap[field]} = $${
          index + 1
        }`
    );

  values.push(userId);

  const result =
    await pool.query(
      `
        UPDATE users
        SET
          ${setClauses.join(
            ", "
          )},
          updated_at = NOW()

        WHERE id = $${
          values.length
        }

        RETURNING *;
      `,
      values
    );

  return (
    result.rows[0] ||
    null
  );
}

module.exports = {
  verifyClerkUser,
  findUserByClerkId,
  findUserById,
  findUserByUsername,
  createUser,
  getOrCreateUser,
  getCurrentUser,
  updateUser,
};