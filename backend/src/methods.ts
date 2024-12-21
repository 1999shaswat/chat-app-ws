import { WebSocket } from "ws"
import { UserEvents, ServerResponses, ServerEvents, UserId_RoomId } from "./events.js"
import { customAlphabet } from "nanoid"

// Define a custom alphabet and length for userId and roomId
const generateUserId = customAlphabet("1234567890", 5)
const generateRoomId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", 5)

interface RoomMember {
  socket: WebSocket
  userId: string
}

let rooms = new Map<string, RoomMember[]>()
let userToRoom = new Map<string, string>()
let userIdToName = new Map<string, string>()

export function addMemberToRoom(socket: WebSocket, payload: UserEvents["payload"]) {
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

export function sendMessageToRoom(payload: UserEvents["payload"]) {
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
    try {
      const messageObj: ServerEvents = {
        type: "chat",
        payload: {
          userId,
          userName,
          message,
        },
      }
      socket.send(JSON.stringify(messageObj))
    } catch (error) {
      console.error("Error sending message to client:", error)
    }
  })
}

const roomTimeouts = new Map<string, NodeJS.Timeout>()

function scheduleRoomDeletion(roomId: string, timeout: number) {
  if (roomTimeouts.has(roomId)) return

  const timeoutId = setTimeout(() => {
    const room = rooms.get(roomId)
    if (room && room.length === 0) {
      rooms.delete(roomId)
      roomTimeouts.delete(roomId)
      console.log(`Room ${roomId} deleted due to inactivity.`)
    }
  }, timeout)

  roomTimeouts.set(roomId, timeoutId)
}

export function handle_UserId_RoomId_Request(socket: WebSocket, userId_RoomId: UserId_RoomId) {
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
    rooms.set(roomId, []) // Update the map

    const timeout = 600000 // 10 minutes
    scheduleRoomDeletion(roomId, timeout)

    const roomIdRes: UserId_RoomId = {
      type: "setRoomId",
      payload: {
        roomId,
      },
    }
    socket.send(JSON.stringify(roomIdRes))
    return
  }
}

export function cleanupDisconnectedUser(socket: WebSocket) {
  let userIdToRemove: string | undefined

  // Find the user and remove them from the rooms map
  for (const [roomId, room] of rooms.entries()) {
    // find the corresponding RoomMember obj using current user's socket
    const memberIndex = room.findIndex(({ socket: memberSocket }) => memberSocket === socket)

    if (memberIndex !== -1) {
      userIdToRemove = room[memberIndex].userId

      // Remove the member from the room
      room.splice(memberIndex, 1)

      if (room.length === 0) {
        rooms.delete(roomId) // Remove empty rooms
      } else {
        rooms.set(roomId, room) // Update the room
      }

      const serverResponse: ServerResponses = {
        type: "response",
        payload: {
          action: "leaveroom",
          roomId,
          roomCount: room.length,
          status: "success",
          message: "Room joined",
        },
      }

      room.map((m) => m.socket.send(JSON.stringify(serverResponse)))

      // exit the loop when found
      break
    }
  }

  // Remove the user from the userToRoom map
  if (userIdToRemove) {
    userIdToName.delete(userIdToRemove)
    userToRoom.delete(userIdToRemove)
  }
}