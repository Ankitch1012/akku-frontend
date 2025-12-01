import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import CommunicationRoom from './components/CommunicationRoom';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "akku-backend-production.up.railway.app";

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogin = (username, userId, room) => {
    if (socket) {
      socket.emit('register', { username, userId });
      setUser({ username, userId });
      setRoomId(room);
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    setUser(null);
    setRoomId(null);
  };

  if (!user || !socket) {
    return <Login onLogin={handleLogin} />;
  }

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

