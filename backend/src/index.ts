import { WebSocketServer } from "ws";
import { UserEvents, ServerResponses, UserId_RoomId } from "./events.js";
import express, { Request, Response } from "express";
import { addMemberToRoom, sendMessageToRoom, handle_UserId_RoomId_Request, cleanupDisconnectedUser } from "./methods.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.get("/health", (req: Request, res: Response): void => {
  res.status(200).send("OK");
});

const PORT = parseInt(process.env.PORT || "8080", 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

const server = app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
  const origin = req.headers.origin;

  // Origin Check
  if (origin !== ALLOWED_ORIGIN) {
    console.log("Unauthorized origin:", origin);
    socket.close(4001, "Unauthorized origin");
    return;
  }

  console.log("User connected from:", origin);

  // Temporarily restrict functionality until authenticated

  // handler logic
  socket.on("message", (data) => {
    try {
      const message = data.toString();
      const userRequest: UserEvents = JSON.parse(message);

      if (userRequest.type === "join") {
        addMemberToRoom(socket, userRequest.payload);
        return;
      }

      if (userRequest.type === "chat") {
        sendMessageToRoom(userRequest.payload);
        return;
      }

      // createRoom or getUserId
      const userId_RoomId: UserId_RoomId = JSON.parse(message);
      handle_UserId_RoomId_Request(socket, userId_RoomId);
    } catch (error) {
      console.error("Error processing message:", error);
      const serverResponse: ServerResponses = {
        type: "response",
        payload: {
          status: "error",
          message: "Invalid request format",
        },
      };
      socket.send(JSON.stringify(serverResponse));
    }
  });

  //disconnect logic
  socket.on("close", () => cleanupDisconnectedUser(socket));
});
