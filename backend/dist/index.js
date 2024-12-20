import { WebSocketServer } from "ws";
import { customAlphabet } from "nanoid";
// Define a custom alphabet and length for userId and roomId
const generateUserId = customAlphabet("1234567890", 5);
const generateRoomId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", 5);
const wss = new WebSocketServer({ port: 8080 });
let rooms = new Map();
let userToRoom = new Map();
let userIdToName = new Map();
function addMemberToRoom(socket, payload) {
    var _a, _b;
    const roomId = (_a = payload.roomId) !== null && _a !== void 0 ? _a : "";
    const room = rooms.get(roomId);
    if (!room) {
        const serverResponse = {
            type: "response",
            payload: {
                action: "joinroom",
                status: "error",
                message: "Couldn't join Room, invalid Room ID",
            },
        };
        socket.send(JSON.stringify(serverResponse));
        return; // return error on invalid id
    }
    room.push({ socket: socket, userId: payload.userId });
    rooms.set(roomId, room); // Update the map
    userToRoom.set(payload.userId, roomId);
    userIdToName.set(payload.userId, (_b = payload.userName) !== null && _b !== void 0 ? _b : "");
    const serverResponse = {
        type: "response",
        payload: {
            action: "joinroom",
            roomId,
            roomCount: room.length,
            status: "success",
            message: "Room joined",
        },
    };
    room.map((m) => m.socket.send(JSON.stringify(serverResponse)));
    // socket.send(JSON.stringify(serverResponse))
}
function sendMessageToRoom(payload) {
    var _a, _b, _c, _d;
    const userId = (_a = payload.userId) !== null && _a !== void 0 ? _a : "";
    const userName = (_b = userIdToName.get(userId)) !== null && _b !== void 0 ? _b : "";
    const message = (_c = payload.message) !== null && _c !== void 0 ? _c : "";
    const roomId = (_d = userToRoom.get(userId)) !== null && _d !== void 0 ? _d : "";
    const room = rooms.get(roomId);
    if (!room) {
        console.error(`Room ${roomId} not found.`);
        return;
    }
    room.forEach(({ socket }) => {
        const messageObj = {
            type: "chat",
            payload: {
                userId,
                userName,
                message,
            },
        };
        socket.send(JSON.stringify(messageObj));
    });
}
function handle_UserId_RoomId_Request(socket, userId_RoomId) {
    if (userId_RoomId.type === "getUserId") {
        const userIdRes = {
            type: "setUserId",
            payload: {
                userId: generateUserId(),
            },
        };
        socket.send(JSON.stringify(userIdRes));
        return;
    }
    if (userId_RoomId.type === "createRoom") {
        const roomId = generateRoomId();
        const roomIdRes = {
            type: "setRoomId",
            payload: {
                roomId,
            },
        };
        rooms.set(roomId, []); // Update the map
        const timeout = 600000; // 10 minutes
        setTimeout(() => {
            const room = rooms.get(roomId);
            if (room && room.length === 0) {
                rooms.delete(roomId); // Delete the room from the map
                console.log(`Room ${roomId} deleted due to inactivity.`);
            }
        }, timeout);
        socket.send(JSON.stringify(roomIdRes));
        return;
    }
}
wss.on("connection", (socket) => {
    console.log("user connected");
    // handler logic
    socket.on("message", (data) => {
        const message = data.toString();
        // console.log(message)
        const userRequest = JSON.parse(message);
        if (userRequest.type === "join") {
            addMemberToRoom(socket, userRequest.payload);
            return;
        }
        if (userRequest.type === "chat") {
            sendMessageToRoom(userRequest.payload);
            return;
        }
        const userId_RoomId = JSON.parse(message);
        handle_UserId_RoomId_Request(socket, userId_RoomId);
    });
    //disconnect logic
    socket.on("close", () => {
        // Remove user from room and cleanup
        let userIdToRemove;
        // Find the user and remove them from the rooms map
        for (const [roomId, members] of rooms.entries()) {
            // find the corresponding RoomMember obj using current user's socket
            const memberIndex = members.findIndex(({ socket: memberSocket }) => memberSocket === socket);
            if (memberIndex !== -1) {
                userIdToRemove = members[memberIndex].userId;
                // Remove the member from the room
                members.splice(memberIndex, 1);
                if (members.length === 0) {
                    rooms.delete(roomId); // Remove empty rooms
                }
                else {
                    rooms.set(roomId, members); // Update the room
                }
                // exit the loop when found
                break;
            }
        }
        // Remove the user from the userToRoom map
        if (userIdToRemove) {
            userIdToName.delete(userIdToRemove);
            userToRoom.delete(userIdToRemove);
        }
    });
});
