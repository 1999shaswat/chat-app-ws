import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppContext } from "@/Context"
import { UserId_RoomId, UserEvents, ServerResponse } from "@/events"
import { copyToClipboard } from "@/helpers"
import { Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function Home({ setView }: { setView: (view: "home" | "room") => void }) {
  const { thisUserId, setThisUserId, thisRoomId, setThisRoomId, setThisRoomCount, websocket } = useAppContext()

  const [roomIdInput, setRoomIdInput] = useState("")
  const [userNameInput, setUserNameInput] = useState("")

  useEffect(() => {
    if (websocket) {
      websocket.onerror = function (error) {
        console.error("WebSocket error:", error)
        toast.error("Oops! Server's offline")
      }

      websocket.onopen = () => {
        toast.success("Connected successfully!")
        console.log("WebSocket connected")
        //get user id
        const getUserIdObj: UserId_RoomId = {
          type: "getUserId",
          payload: {},
        }

        websocket.send(JSON.stringify(getUserIdObj))
      }

      websocket.onmessage = (event) => {
        const data: UserId_RoomId = JSON.parse(event.data)
        if (data.type === "setUserId" && data.payload.userId) {
          setThisUserId(data.payload.userId)
          return
        }
        if (data.type === "setRoomId" && data.payload.roomId) {
          setRoomIdInput(data.payload.roomId)
          setThisRoomId(data.payload.roomId)
          return
        }
        const serverResponse: ServerResponse = JSON.parse(event.data)

        if (serverResponse.type === "response") {
          if (serverResponse.payload.status === "error") {
            toast.error(serverResponse.payload.message)
          } else if (serverResponse.payload.status === "success") {
            toast.success(serverResponse.payload.message)
            // page actions
            if (serverResponse.payload.action === "joinroom") {
              setThisRoomId(serverResponse.payload.roomId ?? "")
              setThisRoomCount(serverResponse.payload.roomCount ?? 0)
              setView("room")
            }
          }
          return
        }
      }
    }
  }, [websocket])

  return (
    <div className='border rounded-2xl p-5 w-full shadow-xl bg-white'>
      <Header />
      <Button
        type='button'
        onClick={() => createRoom(websocket)}
        className='bg-[#ded1f6] hover:bg-[#cabae9] text-[#5E548E] font-semibold py-6 mt-5 mb-6 w-full text-lg rounded-lg shadow'>
        Create New Room
      </Button>
      <Input
        type='text'
        className='px-4 py-2 border border-[#E4E7EB] rounded-lg text-[#3B4C5A] mb-3'
        onChange={(e) => setUserNameInput(e.target.value)}
        placeholder='Name'
      />
      <div className='flex gap-2 mb-3'>
        <Input
          type='text'
          className='px-4 py-2 border border-[#E4E7EB] rounded-lg text-[#3B4C5A]'
          onChange={(e) => setRoomIdInput(e.target.value)}
          placeholder='Room code'
          value={roomIdInput}
        />
        <Button
          type='button'
          onClick={() => joinRoom(thisUserId, userNameInput, roomIdInput, websocket)}
          className='bg-[#F2C6D2] hover:bg-[#ebb0c0] text-[#5E4B57] font-semibold px-8'>
          Join Room
        </Button>
      </div>
      {thisRoomId.length > 0 && (
        <div className='flex flex-col justify-center items-center w-full mt-2 p-6  bg-[#dff7e8] text-[#3b5a4b] rounded-lg'>
          <span className='text-muted-foreground mb-2'>Share this code with your friend</span>
          <div className='flex items-center gap-2'>
            <div className='text-2xl font-bold text-gray-600'>{thisRoomId}</div>
            <Copy className='cursor-pointer text-gray-400 hover:text-gray-600' onClick={() => copyToClipboard(thisRoomId)} />
          </div>
        </div>
      )}
    </div>
  )
}

function createRoom(websocket: WebSocket | null) {
  if (!websocket) {
    return
  }

  //create Room
  const createRoomObj: UserId_RoomId = {
    type: "createRoom",
    payload: {},
  }

  websocket.send(JSON.stringify(createRoomObj))
}

function joinRoom(thisUserId: string, userNameInput: string, roomIdInput: string, websocket: WebSocket | null) {
  if (!websocket) {
    return
  }

  if (userNameInput.length == 0 || roomIdInput.length == 0) {
    toast.error("Oops! You forgot to enter a username or room ID.")
    return
  }

  // const thisUserId = "me"
  const joinEvent: UserEvents = {
    type: "join",
    payload: {
      userId: thisUserId,
      userName: userNameInput,
      roomId: roomIdInput,
    },
  }

  websocket.send(JSON.stringify(joinEvent))
}
