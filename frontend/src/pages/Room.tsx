import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppContext } from "@/Context"
import { ServerEvents, ServerResponse, UserEvents } from "@/events"
import { copyToClipboard } from "@/helpers"
import { Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {toast} from "sonner"

export default function Room() {
  const [userInput, setUserInput] = useState("")
  const [messages, setMessages] = useState<ServerEvents[]>([]) // array of obj response

  const { thisUserId, thisRoomId, thisRoomCount, setThisRoomCount, websocket } = useAppContext()

  useEffect(() => {
    // const newMessages = generateMessages(20)
    // setMessages(newMessages)

    if (websocket) {
      // websocket.onopen = () => {
      //   console.log("WebSocket connected")
      // }

      websocket.onmessage = (event) => {
        const data: ServerEvents = JSON.parse(event.data)
        if (data.type === "chat") {
          setMessages((m) => [...m, data])
          return
        }

        const serverResponse: ServerResponse = JSON.parse(event.data)

        if (serverResponse.type === "response") {
          if (serverResponse.payload.status === "error") {
            // toast.error(serverResponse.payload.message)
          } else if (serverResponse.payload.status === "success") {
            // toast.success(serverResponse.payload.message)
            // page actions
            if (serverResponse.payload.action === "joinroom") {
              setThisRoomCount(serverResponse.payload.roomCount ?? 0)
            }
          }
          return
        }
      }

      // runs on unmount
      return () => {
        websocket.close()
      }
    }
  }, [websocket])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  return (
    <div className='border rounded-2xl p-5 w-full shadow-xl bg-white'>
      <Header />
      <div className='bg-[#ffeded] border border-[#f3e1e1] text-[#5E548E] flex justify-between my-5 px-4 py-3 rounded-lg'>
        <div className='font-semibold flex items-center gap-1'>
          Room Code: <span className='font-normal text-[#3B4C5A]'>{thisRoomId}</span>
          <Copy className='cursor-pointer text-gray-400 hover:text-gray-600' onClick={() => copyToClipboard(thisRoomId)} size={16} />
        </div>
        <div className=''>
          Users: <span className='font-normal text-[#3B4C5A]'>{thisRoomCount}</span>
        </div>
      </div>
      <div className='border border-[#E4E7EB] bg-[#FDFCFB] rounded-lg h-96 overflow-auto'>
        {messages.length === 0 && (
          <div className='flex items-center justify-center h-full text-[#9AA5B1] italic'>No messages yet. Let’s chat! ✨💬</div>
        )}
        {messages.map((m, ind) => (
          <Message userId={m.payload.userId} userName={m.payload.userName} message={m.payload.message} key={ind} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className='flex w-full mt-3 mb-1 items-center space-x-2'>
        <Input
          className='px-4 py-2 border border-[#E4E7EB] rounded-lg text-[#3B4C5A]'
          type='text'
          onChange={(e) => setUserInput(e.target.value)}
          placeholder='Type a message...'
          value={userInput}
        />
        <Button
          type='button'
          className='bg-[#B8EBD0] hover:bg-[#A4E0C3] text-[#35664C] font-semibold px-8 py-2 rounded-lg shadow'
          onClick={() => sendMessage(thisUserId, userInput, setUserInput, websocket)}>
          Send
        </Button>
      </div>
    </div>
  )
}

function sendMessage(thisUserId: string, message: string, setUserInput: (message: string) => void, websocket: WebSocket | null) {
  if (!websocket) {
    console.log("ws undefined")
    return
  }
  
  if (message.length==0) {
    toast.error("Oops! You forgot to type your message")
    return
  }

  const messageEvent: UserEvents = {
    type: "chat",
    payload: {
      userId: thisUserId,
      message,
    },
  }

  websocket.send(JSON.stringify(messageEvent))
  setUserInput("")
}

function Message({ userId, userName, message }: { userId: string; userName: string; message: string }) {
  const { thisUserId } = useAppContext()
  const thisUser = userId === thisUserId

  return (
    <>
      {thisUser ? (
        <div className='flex justify-end p-3'>
          <div className='flex flex-col'>
            <div className='text-xs text-end pb-1'>
              <span>me</span>
            </div>
            <div className='bg-[#D7CFE6] text-[#5E548E]  border-[#C4B8DC] hover:bg-[#C4B8DC] px-3 py-1 rounded-lg max-w-80'>{message}</div>
          </div>
        </div>
      ) : (
        <div className='flex p-3'>
          <div className='flex flex-col'>
            <div className='text-xs pb-1'>
              <span>{userName}</span>
            </div>
            <div className='bg-[#DAE7F2] text-[#3B4C5A] border-[#9EBBD9] hover:bg-[#B3D1E6] px-3 py-1 rounded-lg max-w-80'>{message}</div>
          </div>
        </div>
      )}
    </>
  )
}
