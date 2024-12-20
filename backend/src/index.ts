import { WebSocket, WebSocketServer } from "ws"
import { UserEvents, ServerResponses, ServerEvents, UserId_RoomId } from "./events"
import { customAlphabet } from "nanoid"

// Define a custom alphabet and length for userId and roomId
const generateUserId = customAlphabet("1234567890", 5)
const generateRoomId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", 5)

const wss = new WebSocketServer({ port: 8080 })

interface RoomMember {
  socket: WebSocket
  userId: string
}

let rooms = new Map<string, RoomMember[]>()
let userToRoom = new Map<string, string>()
let userIdToName = new Map<string, string>()

function addMemberToRoom(socket: WebSocket, payload: UserEvents["payload"]) {
  const roomId = payload.roomId ?? ""

  const room = rooms.get(roomId)

  if (!room) {
    const serverResponse: ServerResponses = {
      type: "response",
      payload: {
        action: "joinroom",
        status: "error",
        message: "Couldn't join Room, invalid Room ID",
      },
    }
    socket.send(JSON.stringify(serverResponse))
    return // return error on invalid id
  }

  room.push({ socket: socket, userId: payload.userId })
  rooms.set(roomId, room) // Update the map

  userToRoom.set(payload.userId, roomId)
  userIdToName.set(payload.userId, payload.userName ?? "")

  const serverResponse: ServerResponses = {
    type: "response",
    payload: {
      action: "joinroom",
      roomId,
      roomCount: room.length,
      status: "success",
      message: "Room joined",
    },
  }

  room.map((m) => m.socket.send(JSON.stringify(serverResponse)))
  // socket.send(JSON.stringify(serverResponse))
}

function sendMessageToRoom(payload: UserEvents["payload"]) {
  const userId = payload.userId ?? ""
  const userName = userIdToName.get(userId) ?? ""
  const message = payload.message ?? ""

  const roomId = userToRoom.get(userId) ?? ""

  const room = rooms.get(roomId)

  if (!room) {
    console.error(`Room ${roomId} not found.`)
    return
  }

  room.forEach(({ socket }) => {
    const messageObj: ServerEvents = {
      type: "chat",
      payload: {
        userId,
        userName,
        message,
      },
    }
    socket.send(JSON.stringify(messageObj))
  })
}

function handle_UserId_RoomId_Request(socket: WebSocket, userId_RoomId: UserId_RoomId) {
  if (userId_RoomId.type === "getUserId") {
    const userIdRes: UserId_RoomId = {
      type: "setUserId",
      payload: {
        userId: generateUserId(),
      },
    }
    socket.send(JSON.stringify(userIdRes))
    return
  }

  if (userId_RoomId.type === "createRoom") {
    const roomId = generateRoomId()
    const roomIdRes: UserId_RoomId = {
      type: "setRoomId",
      payload: {
        roomId,
      },
    }
    rooms.set(roomId, []) // Update the map

    const timeout = 600000 // 10 minutes
    setTimeout(() => {
      const room = rooms.get(roomId)
      if (room && room.length === 0) {
        rooms.delete(roomId) // Delete the room from the map
        console.log(`Room ${roomId} deleted due to inactivity.`)
      }
    }, timeout)
    socket.send(JSON.stringify(roomIdRes))
    return
  }
}

wss.on("connection", (socket) => {
  console.log("user connected")

  // handler logic
  socket.on("message", (data) => {
    const message = data.toString()

    // console.log(message)

    const userRequest: UserEvents = JSON.parse(message)

    if (userRequest.type === "join") {
      addMemberToRoom(socket, userRequest.payload)
      return
    }

    if (userRequest.type === "chat") {
      sendMessageToRoom(userRequest.payload)
      return
    }

    const userId_RoomId: UserId_RoomId = JSON.parse(message)
    handle_UserId_RoomId_Request(socket, userId_RoomId)
  })

  //disconnect logic
  socket.on("close", () => {
    // Remove user from room and cleanup
    let userIdToRemove: string | undefined

    // Find the user and remove them from the rooms map
    for (const [roomId, members] of rooms.entries()) {
      // find the corresponding RoomMember obj using current user's socket
      const memberIndex = members.findIndex(({ socket: memberSocket }) => memberSocket === socket)

      if (memberIndex !== -1) {
        userIdToRemove = members[memberIndex].userId

        // Remove the member from the room
        members.splice(memberIndex, 1)

        if (members.length === 0) {
          rooms.delete(roomId) // Remove empty rooms
        } else {
          rooms.set(roomId, members) // Update the room
        }

        // exit the loop when found
        break
      }
    }

    // Remove the user from the userToRoom map
    if (userIdToRemove) {
      userIdToName.delete(userIdToRemove)
      userToRoom.delete(userIdToRemove)
    }
  })
})
