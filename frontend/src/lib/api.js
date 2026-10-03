const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

async function request(
  path,
  getToken,
  options = {}
) {
  const token =
    await getToken();

  const headers = {
    "Content-Type":
      "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
        cache: "no-store",
      }
    );

  const data =
    await response.json()
      .catch(() => null);

  if (!response.ok) {
    const error =
      new Error(
        data?.error?.message ||
        "API request failed."
      );

    error.code =
      data?.error?.code;

    error.status =
      response.status;

    throw error;
  }

  return data;
}

export function getLobby(
  getToken
) {
  return request(
    "/api/lobby",
    getToken
  );
}

export function searchPlayers(
  getToken,
  query
) {
  return request(
    `/api/lobby/players/search?q=${encodeURIComponent(query)}`,
    getToken
  );
}

export function createChallenge(
  getToken,
  body
) {
  return request(
    "/api/lobby/challenges",
    getToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export function acceptChallenge(
  getToken,
  challengeId
) {
  return request(
    `/api/lobby/challenges/${challengeId}/accept`,
    getToken,
    {
      method: "POST",
    }
  );
}

export function declineChallenge(
  getToken,
  challengeId
) {
  return request(
    `/api/lobby/challenges/${challengeId}/decline`,
    getToken,
    {
      method: "POST",
    }
  );
}

export function cancelChallenge(
  getToken,
  challengeId
) {
  return request(
    `/api/lobby/challenges/${challengeId}/cancel`,
    getToken,
    {
      method: "POST",
    }
  );
}

export function joinMatchmaking(
  getToken,
  body
) {
  return request(
    "/api/lobby/matchmaking/join",
    getToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export function leaveMatchmaking(
  getToken
) {
  return request(
    "/api/lobby/matchmaking/leave",
    getToken,
    {
      method: "POST",
    }
  );
}