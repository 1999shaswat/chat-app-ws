import {toast} from "sonner"
import { ServerEvents } from "./events"

const generateRandomMessage = (userId: string, userName: string): ServerEvents => {
  const messages = [
    "Hello there!",
    "How's it going?",
    "Good morning!",
    "What are you up to?",
    "This is a random message.",
    "Let me know if you need help.",
    "I'm just chilling.",
    "Have a great day!",
    "Happy to chat with you.",
    "How can I assist you?",
    "Nice to meet you!",
    "Long time no see!",
    "Are you busy?",
    "Let's talk soon.",
    "Catch up later!",
    "Got any plans?",
    "Hope you're doing well!",
    "What's new with you?",
    "Let's get started.",
    "Thanks for reaching out!",
  ]

  const message = messages[Math.floor(Math.random() * messages.length)]

  return {
    type: "chat",
    payload: {
      userId,
      userName,
      message,
    },
  }
}

export const generateMessages = (count: number) => {
  const userId = "user123" // Example user ID
  const userName = "John Doe" // Example user name
  const newMessages = Array.from({ length: count }, () => generateRandomMessage(userId, userName))
  return newMessages
}

export const copyToClipboard = async (textToCopy: string) => {
  try {
    await navigator.clipboard.writeText(textToCopy) // Copy text to clipboard
    toast.success("Code Copied")
  } catch (err) {
    toast.success("Failed to copy")
  }
}