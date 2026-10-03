"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
  useUser,
} from "@clerk/nextjs";

import {
  ArrowRight,
  Clock3,
  Gamepad2,
  Loader2,
  Search,
  Swords,
  Users,
  X,
} from "lucide-react";

import {
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  declineChallenge,
  getLobby,
  joinMatchmaking,
  leaveMatchmaking,
  searchPlayers,
} from "../lib/api";

import {
  createSocket,
} from "../lib/socket";

import AlignItShell from "./AlignItShell";

export default function LobbyClient() {
  const {
    isLoaded,
    isSignedIn,
    getToken,
  } = useAuth();

  const {
    user,
  } = useUser();

  const [
    lobby,
    setLobby,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activePanel,
    setActivePanel,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    players,
    setPlayers,
  ] = useState([]);

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] = useState(null);

  const [
    colorPreference,
    setColorPreference,
  ] = useState("random");

  const [
    timeControl,
    setTimeControl,
  ] = useState(300);

  const [
    busy,
    setBusy,
  ] = useState(false);

  async function loadLobby() {
    try {
      setLoading(true);
      setError("");

      const response =
        await getLobby(getToken);

      setLobby(response.data);
    } catch (err) {
      setError(
        err.message ||
        "Unable to load lobby."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      isLoaded &&
      isSignedIn
    ) {
      loadLobby();
    }
  }, [
    isLoaded,
    isSignedIn,
  ]);

  useEffect(() => {
    let socket;

    async function connect() {
      if (
        !isLoaded ||
        !isSignedIn
      ) {
        return;
      }

      socket =
        await createSocket(
          getToken
        );

      socket.on(
        "lobby:state",
        (data) => {
          setLobby(data);
        }
      );

      socket.on(
        "lobby:connected",
        () => {
          socket.emit(
            "lobby:refresh"
          );
        }
      );

      socket.on(
        "lobby:challenge",
        () => {
          loadLobby();
        }
      );

      socket.on(
        "lobby:challenge:accepted",
        (payload) => {
          loadLobby();

          if (
            payload?.game?.gameId
          ) {
            window.location.href =
              `/game/${payload.game.gameId}`;
          }
        }
      );

      socket.on(
        "lobby:match-found",
        (payload) => {
          loadLobby();

          if (
            payload?.game?.gameId
          ) {
            window.location.href =
              `/game/${payload.game.gameId}`;
          }
        }
      );

      return () => {
        socket?.disconnect();
      };
    }

    const cleanup =
      connect();

    return () => {
      Promise.resolve(cleanup).then(
        (fn) => fn?.()
      );
    };
  }, [
    isLoaded,
    isSignedIn,
  ]);

  async function handleSearch(
    value
  ) {
    setSearch(value);

    if (
      value.trim().length < 2
    ) {
      setPlayers([]);
      return;
    }

    try {
      const response =
        await searchPlayers(
          getToken,
          value
        );

      setPlayers(
        response.data?.players ||
        []
      );
    } catch {
      setPlayers([]);
    }
  }

  async function handleChallenge() {
    if (!selectedPlayer) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      await createChallenge(
        getToken,
        {
          opponentClerkUserId:
            selectedPlayer.clerk_user_id,

          colorPreference,

          timeControlSeconds:
            timeControl,
        }
      );

      await loadLobby();

      setSelectedPlayer(null);
      setSearch("");
      setPlayers([]);
      setActivePanel(null);
    } catch (err) {
      setError(
        err.message ||
        "Unable to send challenge."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(
    challengeId
  ) {
    try {
      setBusy(true);

      const response =
        await acceptChallenge(
          getToken,
          challengeId
        );

      const game =
        response.data?.game;

      if (game?.gameId) {
        window.location.href =
          `/game/${game.gameId}`;

        return;
      }

      await loadLobby();
    } catch (err) {
      setError(
        err.message ||
        "Unable to accept challenge."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline(
    challengeId
  ) {
    try {
      setBusy(true);

      await declineChallenge(
        getToken,
        challengeId
      );

      await loadLobby();
    } catch (err) {
      setError(
        err.message ||
        "Unable to decline challenge."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(
    challengeId
  ) {
    try {
      setBusy(true);

      await cancelChallenge(
        getToken,
        challengeId
      );

      await loadLobby();
    } catch (err) {
      setError(
        err.message ||
        "Unable to cancel challenge."
      );
    } finally {
      setBusy(false);
    }
  }

  async function startQuickPlay() {
    try {
      setBusy(true);
      setError("");

      const response =
        await joinMatchmaking(
          getToken,
          {
            timeControlSeconds:
              timeControl,

            colorPreference:
              "random",
          }
        );

      const game =
        response.data?.match?.game;

      if (game?.gameId) {
        window.location.href =
          `/game/${game.gameId}`;

        return;
      }

      setActivePanel(
        "matchmaking"
      );

      await loadLobby();
    } catch (err) {
      setError(
        err.message ||
        "Unable to join matchmaking."
      );
    } finally {
      setBusy(false);
    }
  }

  async function stopQuickPlay() {
    try {
      setBusy(true);

      await leaveMatchmaking(
        getToken
      );

      setActivePanel(null);

      await loadLobby();
    } catch (err) {
      setError(
        err.message ||
        "Unable to stop matchmaking."
      );
    } finally {
      setBusy(false);
    }
  }

  const rating =
    lobby?.user?.rating ||
    1200;

  const incoming =
    lobby?.incomingChallenges ||
    [];

  const outgoing =
    lobby?.outgoingChallenges ||
    [];

  const activeGames =
    lobby?.activeGames ||
    [];

  const isSearching =
    Boolean(lobby?.queue);

  const displayName =
    lobby?.user?.display_name ||
    user?.firstName ||
    user?.username ||
    "Player";

  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2
          className="animate-spin"
          size={28}
        />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Please sign in to continue.
      </div>
    );
  }

  if (loading && !lobby) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2
          className="animate-spin"
          size={28}
        />
      </div>
    );
  }

  return (
    <AlignItShell>
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="mb-8 overflow-hidden rounded-[28px] bg-[#315c46] p-7 text-white lg:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                Welcome back
              </p>

              <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
                {displayName}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                Choose your next Morabaraba battle.
                Find an opponent, challenge a friend,
                or jump straight into matchmaking.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-lg font-black">
                {initials}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">
                  Rating
                </p>

                <p className="text-2xl font-black">
                  {rating}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <ActionCard
            icon={Swords}
            title="Quick Play"
            text="Find a rated opponent automatically."
            onClick={startQuickPlay}
            loading={
              busy &&
              activePanel === "matchmaking"
            }
          />

          <ActionCard
            icon={Users}
            title="Challenge"
            text="Find another Align It player."
            onClick={() =>
              setActivePanel("challenge")
            }
          />

          <ActionCard
            icon={Gamepad2}
            title="Custom Game"
            text="Choose your opponent and settings."
            onClick={() =>
              setActivePanel("challenge")
            }
          />
        </section>

        {isSearching && (
          <section className="mb-8 rounded-3xl border border-[#e5e5df] bg-white p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#a97922]">
                  Matchmaking
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Looking for an opponent...
                </h2>

                <p className="mt-1 text-sm text-[#6d6d68]">
                  We are searching around your rating.
                </p>
              </div>

              <button
                onClick={stopQuickPlay}
                disabled={busy}
                className="rounded-xl border border-[#e5e5df] px-5 py-3 text-sm font-bold hover:bg-[#f5f5f0]"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {incoming.length > 0 && (
          <section className="mb-8">
            <SectionTitle
              title="Challenges"
              count={incoming.length}
            />

            <div className="grid gap-3">
              {incoming.map(
                (challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    incoming
                    busy={busy}
                    onAccept={() =>
                      handleAccept(
                        challenge.id
                      )
                    }
                    onDecline={() =>
                      handleDecline(
                        challenge.id
                      )
                    }
                  />
                )
              )}
            </div>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="mb-8">
            <SectionTitle
              title="Sent challenges"
              count={outgoing.length}
            />

            <div className="grid gap-3">
              {outgoing.map(
                (challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    busy={busy}
                    onCancel={() =>
                      handleCancel(
                        challenge.id
                      )
                    }
                  />
                )
              )}
            </div>
          </section>
        )}

        <section className="mb-8">
          <SectionTitle
            title="Your games"
            count={activeGames.length}
          />

          {activeGames.length === 0 ? (
            <EmptyGames />
          ) : (
            <div className="grid gap-3">
              {activeGames.map(
                (game) => (
                  <ActiveGame
                    key={game.public_id}
                    game={game}
                  />
                )
              )}
            </div>
          )}
        </section>

        {activePanel === "challenge" && (
          <ChallengePanel
            search={search}
            players={players}
            selectedPlayer={
              selectedPlayer
            }
            colorPreference={
              colorPreference
            }
            timeControl={
              timeControl
            }
            busy={busy}
            onSearch={
              handleSearch
            }
            onSelect={
              setSelectedPlayer
            }
            onColorChange={
              setColorPreference
            }
            onTimeChange={
              setTimeControl
            }
            onChallenge={
              handleChallenge
            }
            onClose={() =>
              setActivePanel(null)
            }
          />
        )}
      </div>
    </AlignItShell>
  );
}

function ActionCard({
  icon: Icon,
  title,
  text,
  onClick,
  loading,
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group rounded-3xl border border-[#e5e5df] bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-[#d9a441] hover:shadow-lg"
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5f5f0] text-[#315c46]">
          {loading ? (
            <Loader2
              size={21}
              className="animate-spin"
            />
          ) : (
            <Icon size={21} />
          )}
        </div>

        <ArrowRight
          size={19}
          className="text-[#b5b5ae] transition group-hover:translate-x-1 group-hover:text-[#315c46]"
        />
      </div>

      <h3 className="text-lg font-black">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-[#6d6d68]">
        {text}
      </p>
    </button>
  );
}

function SectionTitle({
  title,
  count,
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="text-xl font-black">
        {title}
      </h2>

      <span className="rounded-full bg-[#e9e9e3] px-2.5 py-1 text-xs font-bold">
        {count}
      </span>
    </div>
  );
}

function ChallengeCard({
  challenge,
  incoming,
  busy,
  onAccept,
  onDecline,
  onCancel,
}) {
  const name =
    incoming
      ? challenge.display_name ||
        challenge.username
      : challenge.display_name ||
        challenge.username;

  return (
    <div className="flex flex-col justify-between gap-5 rounded-2xl border border-[#e5e5df] bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <p className="font-black">
          {name}
        </p>

        <p className="mt-1 text-sm text-[#6d6d68]">
          Rating {challenge.rating || 1200}
          {" · "}
          {challenge.color_preference}
          {" · "}
          {challenge.time_control_seconds
            ? `${challenge.time_control_seconds / 60} min`
            : "Unlimited"}
        </p>
      </div>

      <div className="flex gap-2">
        {incoming ? (
          <>
            <button
              onClick={onAccept}
              disabled={busy}
              className="rounded-xl bg-[#315c46] px-4 py-2.5 text-sm font-bold text-white"
            >
              Accept
            </button>

            <button
              onClick={onDecline}
              disabled={busy}
              className="rounded-xl border border-[#e5e5df] px-4 py-2.5 text-sm font-bold"
            >
              Decline
            </button>
          </>
        ) : (
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-[#e5e5df] px-4 py-2.5 text-sm font-bold"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveGame({
  game,
}) {
  return (
    <a
      href={`/game/${game.public_id}`}
      className="group flex flex-col justify-between gap-5 rounded-2xl border border-[#e5e5df] bg-white p-5 transition hover:border-[#d9a441] sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#315c46] font-black text-white">
          {game.my_color === "white"
            ? "W"
            : "B"}
        </div>

        <div>
          <p className="font-black">
            {game.opponent_display_name ||
              game.opponent_username}
          </p>

          <p className="mt-1 text-sm text-[#6d6d68]">
            Rating{" "}
            {game.opponent_rating ||
              1200}
            {" · "}
            {game.my_color}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-[#f5f5f0] px-3 py-1.5 text-xs font-bold">
          {game.status}
        </span>

        <ArrowRight
          size={18}
          className="text-[#6d6d68] transition group-hover:translate-x-1"
        />
      </div>
    </a>
  );
}

function EmptyGames() {
  return (
    <div className="rounded-3xl border border-dashed border-[#d7d7d0] bg-white/60 px-6 py-12 text-center">
      <Gamepad2
        className="mx-auto mb-3 text-[#9c9c95]"
        size={28}
      />

      <p className="font-bold">
        No active games
      </p>

      <p className="mt-1 text-sm text-[#6d6d68]">
        Start a game to see it here.
      </p>
    </div>
  );
}

function ChallengePanel({
  search,
  players,
  selectedPlayer,
  colorPreference,
  timeControl,
  busy,
  onSearch,
  onSelect,
  onColorChange,
  onTimeChange,
  onChallenge,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-[#f5f5f0] p-6 sm:rounded-[28px] sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a97922]">
              New game
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Challenge a player
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9c9c95]"
          />

          <input
            value={search}
            onChange={(event) =>
              onSearch(
                event.target.value
              )
            }
            placeholder="Search username..."
            className="w-full rounded-2xl border border-[#e0e0d9] bg-white py-4 pl-11 pr-4 outline-none focus:border-[#315c46]"
          />
        </div>

        <div className="mt-3 space-y-2">
          {players.map(
            (player) => (
              <button
                key={player.id}
                onClick={() =>
                  onSelect(player)
                }
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                  selectedPlayer?.id ===
                  player.id
                    ? "border-[#315c46] bg-[#edf3ef]"
                    : "border-[#e5e5df] bg-white"
                }`}
              >
                <div>
                  <p className="font-black">
                    {player.display_name ||
                      player.username}
                  </p>

                  <p className="mt-1 text-xs text-[#6d6d68]">
                    @{player.username}
                    {" · "}
                    Rating{" "}
                    {player.rating ||
                      1200}
                  </p>
                </div>

                <span className="text-xs font-bold text-[#315c46]">
                  Select
                </span>
              </button>
            )
          )}
        </div>

        {selectedPlayer && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6d6d68]">
                Your color
              </span>

              <select
                value={
                  colorPreference
                }
                onChange={(event) =>
                  onColorChange(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[#e0e0d9] bg-white px-4 py-3 outline-none"
              >
                <option value="random">
                  Random
                </option>

                <option value="white">
                  White
                </option>

                <option value="black">
                  Black
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6d6d68]">
                Time control
              </span>

              <select
                value={
                  timeControl
                }
                onChange={(event) =>
                  onTimeChange(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full rounded-xl border border-[#e0e0d9] bg-white px-4 py-3 outline-none"
              >
                <option value={60}>
                  1 minute
                </option>

                <option value={180}>
                  3 minutes
                </option>

                <option value={300}>
                  5 minutes
                </option>

                <option value={600}>
                  10 minutes
                </option>

                <option value={900}>
                  15 minutes
                </option>

                <option value={1800}>
                  30 minutes
                </option>
              </select>
            </label>
          </div>
        )}

        <button
          onClick={onChallenge}
          disabled={
            !selectedPlayer ||
            busy
          }
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#315c46] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && (
            <Loader2
              size={18}
              className="animate-spin"
            />
          )}

          Send challenge
        </button>
      </div>
    </div>
  );
}