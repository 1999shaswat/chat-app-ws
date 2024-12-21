import { WebSocketServer } from "ws";
import express from "express";
import { addMemberToRoom, sendMessageToRoom, handle_UserId_RoomId_Request, cleanupDisconnectedUser } from "./methods.js";
const app = express();
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});
const PORT = parseInt(process.env.PORT || "8080", 10);
const server = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
const wss = new WebSocketServer({ server });
wss.on("connection", (socket) => {
    console.log("user connected");
    // handler logic
    socket.on("message", (data) => {
        try {
            const message = data.toString();
            const userRequest = JSON.parse(message);
            if (userRequest.type === "join") {
                addMemberToRoom(socket, userRequest.payload);
                return;
            }
            if (userRequest.type === "chat") {
                sendMessageToRoom(userRequest.payload);
                return;
            }
            // createRoom or getUserId
            const userId_RoomId = JSON.parse(message);
            handle_UserId_RoomId_Request(socket, userId_RoomId);
        }
        catch (error) {
            console.error("Error processing message:", error);
            const serverResponse = {
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
