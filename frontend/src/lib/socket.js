import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:3001";

export async function createSocket(
  getToken
) {
  const token =
    await getToken();

  return io(
    SOCKET_URL,
    {
      transports: [
        "websocket",
        "polling",
      ],

      auth: {
        token,
      },

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    }
  );
}