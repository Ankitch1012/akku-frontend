import React, { useState, useEffect } from "react";
import "./App.css";
import Login from "./components/Login";
import CommunicationRoom from "./components/CommunicationRoom";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://akku-backend-production.up.railway.app";

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => console.log("✅ Socket connected:", newSocket.id));
    newSocket.on("disconnect", () => console.log("❌ Socket disconnected"));

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const handleLogin = (username, userId, room) => {
    if (socket) {
      socket.emit("register", { username, userId });
      setUser({ username, userId });
      setRoomId(room);
    }
  };

  const handleLogout = () => {
    socket?.disconnect();
    setUser(null);
    setRoomId(null);
  };

  if (!user || !socket) return <Login onLogin={handleLogin} />;

  return (
    <CommunicationRoom
      socket={socket}
      user={user}
      roomId={roomId}
      onLogout={handleLogout}
    />
  );
}

export default App;
