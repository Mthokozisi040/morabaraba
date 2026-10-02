const registerGameSocket = require("./game.socket");

function initializeSockets(io) {
  io.on("connection", (socket) => {
    console.log(
      `[SOCKET] Client connected: ${socket.id}`
    );

    socket.emit("socket:connected", {
      socketId: socket.id,
      message: "Connected to Align It real-time server",
    });

    registerGameSocket(io, socket);
  });

  console.log("[SOCKET] Socket.IO initialized");
}

module.exports = initializeSockets;