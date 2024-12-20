import "./App.css"
import Home from "./pages/Home"
import Room from "./pages/Room"
import { AppProvider } from "./Context"
import { useState } from "react"
import { Toaster } from "sonner"

function App() {
  const [view, setView] = useState<"home" | "room">("home")
  return (
    <AppProvider>
      <div className='bg-gradient-to-b  from-[#FDFCFB] to-[#F7EDE2] min-h-screen'>
        <Toaster richColors />
        <div className='h-screen flex items-center justify-center mx-auto max-w-2xl'>
          {view === "home" && <Home setView={setView} />}
          {view === "room" && <Room />}
        </div>
      </div>
    </AppProvider>
  )
}

export default App
