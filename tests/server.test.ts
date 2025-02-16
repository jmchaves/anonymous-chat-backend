import request from "supertest";
import { createServer } from "http";
import WebSocket from "ws";
import express from "express";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.get("/create-room", (_, res) => {
  const roomId = uuidv4();
  res.json({ roomId });
});

const server = createServer(app);

describe("Chat Room API", () => {
  let roomId: string;

  beforeAll(async () => {
    const res = await request(server).get("/create-room");
    roomId = res.body.roomId;
  });

  test("should create a new room and return a roomId", async () => {
    expect(roomId).toBeDefined();
  });

  test(
    "should allow only 2 users in a chat room and reject the 3rd user",
    (done) => {
      const ws1 = new WebSocket(`ws://localhost:3000?room=${roomId}`);
      const ws2 = new WebSocket(`ws://localhost:3000?room=${roomId}`);
      const ws3 = new WebSocket(`ws://localhost:3000?room=${roomId}`);

      let rejected = false;

      ws3.on("message", (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.error === "Room is full") {
          rejected = true;
          cleanup();
          expect(rejected).toBe(true);
          done();
        }
      });

      function cleanup() {
        ws1.close();
        ws2.close();
        ws3.close();
      }

      ws3.on("open", () => {
        setTimeout(() => {
          if (!rejected) {
            cleanup();
            done.fail("3rd user was not rejected");
          }
        }, 2000);
      });

      ws3.on("error", (err) => {
        console.error("WebSocket error:", err);
        cleanup();
        done.fail(err);
      });
    },
    10000 // Increase Jest timeout to 10 seconds
  );
});
