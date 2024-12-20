import { useAppContext } from "@/Context"
import { MessageCircle } from "lucide-react"

export default function Header() {
  const { thisUserId } = useAppContext()
  return (
    <>
      <div className='flex justify-between w-full pb-2'>
        <div className='flex gap-2 items-center text-[#5E548E] text-2xl font-semibold border-b border-[#E4E7EB] pb-2'>
          <MessageCircle />
          Real Time Chat
        </div>
        <div className='text-gray-500'>#{thisUserId}</div>
      </div>
      <div className='text-sm font-normal text-[#9AA5B1]'>temporary room that expires after all users exit</div>
    </>
  )
}
