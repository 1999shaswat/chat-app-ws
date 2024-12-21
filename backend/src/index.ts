import { WebSocket, WebSocketServer } from "ws"
import { UserEvents, ServerResponses, ServerEvents, UserId_RoomId } from "./events.js"
import { customAlphabet } from "nanoid"
import express, { Request, Response } from "express"

// const express = require("express");
const app = express()

app.get("/health", (req: Request, res: Response): void => {
  res.status(200).send("OK")
})

const PORT = parseInt(process.env.PORT || "8080", 10)
const server = app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})

const wss = new WebSocketServer({ server })

// Define a custom alphabet and length for userId and roomId
const generateUserId = customAlphabet("1234567890", 5)
const generateRoomId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", 5)

// const PORT = Number(process.env.PORT) || 8080
// const wss = new WebSocketServer({ port: PORT })

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

function cleanupDisconnectedUser(socket: WebSocket) {
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

wss.on("connection", (socket) => {
  console.log("user connected")

  // handler logic
  socket.on("message", (data) => {
    try {
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

      // createRoom or getUserId
      const userId_RoomId: UserId_RoomId = JSON.parse(message)
      handle_UserId_RoomId_Request(socket, userId_RoomId)
    } catch (error) {
      console.error("Error processing message:", error)
      const serverResponse: ServerResponses = {
        type: "response",
        payload: {
          status: "error",
          message: "Invalid request format",
        },
      }
      socket.send(JSON.stringify(serverResponse))
    }
  })

  //disconnect logic
  socket.on("close", () => cleanupDisconnectedUser(socket))
})
