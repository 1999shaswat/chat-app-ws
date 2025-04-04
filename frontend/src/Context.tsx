import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Define the context type
interface AppContextType {
  thisUserId: string;
  setThisUserId: (userId: string) => void;
  thisRoomId: string;
  setThisRoomId: (roomId: string) => void;
  thisRoomCount: number;
  setThisRoomCount: (count: number) => void;
  websocket: WebSocket | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState("");
  const [thisRoomId, setThisRoomId] = useState("");
  const [thisRoomCount, setThisRoomCount] = useState(0);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocketURL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

    const ws = new WebSocket(websocketURL);
    setWebsocket(ws); // Update the WebSocket state

    // ws.onopen = () => console.log("Connected to WebSocket");
    // ws.onclose = () => console.log("Disconnected from WebSocket");
    // ws.onerror = (err) => console.error("WebSocket error:", err);
    // runs on unmount
    return () => {
      ws.close();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        thisUserId: userId,
        setThisUserId: setUserId,
        thisRoomId,
        setThisRoomId,
        thisRoomCount,
        setThisRoomCount,
        websocket,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
