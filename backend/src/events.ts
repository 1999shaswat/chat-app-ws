export interface UserId_RoomId {
  type: "getUserId" | "setUserId" | "createRoom" | "setRoomId"
  payload: {
    userId?: string // events: "setUserId"
    roomId?: string // events: "createRoom"
  }
}

export interface UserEvents {
  type: "join" | "chat"
  payload: {
    userId: string // event: both
    userName?: string // event: "join"
    roomId?: string // event: "join"
    message?: string // event: "chat"
  }
}

export interface ServerEvents {
  type: "chat"
  payload: {
    userId: string
    userName: string
    message: string
  }
}

export interface ServerResponses {
  type: "response"
  payload: {
    action: "joinroom"
    roomId?: string
    roomCount?: number
    status: "error" | "success"
    message: string
  }
}
