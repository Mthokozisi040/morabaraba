CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    clerk_user_id VARCHAR(255) NOT NULL UNIQUE,

    username VARCHAR(20) NOT NULL UNIQUE,

    display_name VARCHAR(100),

    country VARCHAR(100),

    avatar_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- PLAYER PROFILES
-- =========================================================

CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    bio TEXT,

    current_streak INTEGER NOT NULL DEFAULT 0,

    best_streak INTEGER NOT NULL DEFAULT 0,

    games_played INTEGER NOT NULL DEFAULT 0,

    wins INTEGER NOT NULL DEFAULT 0,

    losses INTEGER NOT NULL DEFAULT 0,

    draws INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT profiles_streak_check
        CHECK (current_streak >= 0 AND best_streak >= 0),

    CONSTRAINT profiles_games_check
        CHECK (
            games_played >= 0
            AND wins >= 0
            AND losses >= 0
            AND draws >= 0
        )
);

-- =========================================================
-- RATINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS ratings (
    user_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    rating INTEGER NOT NULL DEFAULT 1200,

    highest_rating INTEGER NOT NULL DEFAULT 1200,

    games_played INTEGER NOT NULL DEFAULT 0,

    wins INTEGER NOT NULL DEFAULT 0,

    losses INTEGER NOT NULL DEFAULT 0,

    draws INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ratings_rating_check
        CHECK (rating >= 0),

    CONSTRAINT ratings_highest_check
        CHECK (highest_rating >= 0),

    CONSTRAINT ratings_games_check
        CHECK (
            games_played >= 0
            AND wins >= 0
            AND losses >= 0
            AND draws >= 0
        )
);

-- =========================================================
-- RATING HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS rating_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    game_id UUID,

    previous_rating INTEGER NOT NULL,

    rating_change INTEGER NOT NULL,

    new_rating INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- GAMES
-- =========================================================

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    public_id VARCHAR(20) NOT NULL UNIQUE,

    game_type VARCHAR(20) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'waiting',

    phase VARCHAR(20) NOT NULL DEFAULT 'placement',

    current_player INTEGER,

    board_state JSONB NOT NULL DEFAULT '{}'::jsonb,

    game_state JSONB NOT NULL DEFAULT '{}'::jsonb,

    time_control_seconds INTEGER,

    player_one_time_ms BIGINT,

    player_two_time_ms BIGINT,

    move_number INTEGER NOT NULL DEFAULT 0,

    winner_user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    result_reason VARCHAR(50),

    started_at TIMESTAMPTZ,

    finished_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT games_type_check
        CHECK (
            game_type IN (
                'casual',
                'rated',
                'ai',
                'friend',
                'custom'
            )
        ),

    CONSTRAINT games_status_check
        CHECK (
            status IN (
                'waiting',
                'active',
                'finished',
                'abandoned',
                'draw'
            )
        ),

    CONSTRAINT games_phase_check
        CHECK (
            phase IN (
                'placement',
                'movement',
                'capture',
                'finished'
            )
        )
);

-- =========================================================
-- GAME PLAYERS
-- =========================================================

CREATE TABLE IF NOT EXISTS game_players (
    game_id UUID NOT NULL
        REFERENCES games(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    player_number INTEGER NOT NULL,

    color VARCHAR(20) NOT NULL,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (game_id, user_id),

    UNIQUE (game_id, player_number),

    CONSTRAINT game_players_number_check
        CHECK (player_number IN (1, 2))
);

-- =========================================================
-- GAME MOVES
-- =========================================================

CREATE TABLE IF NOT EXISTS game_moves (
    id BIGSERIAL PRIMARY KEY,

    game_id UUID NOT NULL
        REFERENCES games(id)
        ON DELETE CASCADE,

    move_number INTEGER NOT NULL,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    action_type VARCHAR(30) NOT NULL,

    action_data JSONB NOT NULL,

    resulting_state JSONB,

    elapsed_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (game_id, move_number)
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_users_username
    ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_country
    ON users(country);

CREATE INDEX IF NOT EXISTS idx_rating_history_user
    ON rating_history(user_id);

CREATE INDEX IF NOT EXISTS idx_rating_history_game
    ON rating_history(game_id);

CREATE INDEX IF NOT EXISTS idx_games_public_id
    ON games(public_id);

CREATE INDEX IF NOT EXISTS idx_games_status
    ON games(status);

CREATE INDEX IF NOT EXISTS idx_games_created_at
    ON games(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_players_user
    ON game_players(user_id);

CREATE INDEX IF NOT EXISTS idx_game_moves_game
    ON game_moves(game_id, move_number);

-- =========================================================
-- UPDATED_AT FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

DROP TRIGGER IF EXISTS update_users_updated_at
ON users;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at
ON profiles;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ratings_updated_at
ON ratings;

CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at
ON games;

CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();