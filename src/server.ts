import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms: Record<string, WebSocket[]> = {};

wss.on("connection", (ws, req) => {
  const urlParams = new URL(req.url!, `http://${req.headers.host}`);
  const roomId = urlParams.searchParams.get("room");

  if (!roomId) {
    ws.send(JSON.stringify({ error: "Invalid room" }));
    ws.close();
    return;
  }

  if (!rooms[roomId]) rooms[roomId] = [];
  if (rooms[roomId].length >= 2) {
    ws.send(JSON.stringify({ error: "Room is full" }));
    ws.close();
    return;
  }

  rooms[roomId].push(ws);
  console.log(`User joined room: ${roomId}, Total: ${rooms[roomId].length}`);

  ws.on("message", (message) => {

    // Ensure the message is JSON before broadcasting
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message.toString());
    } catch (error) {
      console.error("Invalid JSON received:", message);
      return;
    }

    const formattedMessage = JSON.stringify({ message: parsedMessage });

    // Broadcast JSON message to all clients in the room
    rooms[roomId].forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(formattedMessage);
      }
    });
  });

  ws.on("close", () => {
    rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
    if (rooms[roomId].length === 0) delete rooms[roomId];
  });
});

app.get("/create-room", (_, res) => {
  const roomId = uuidv4();
  res.json({ roomId });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
