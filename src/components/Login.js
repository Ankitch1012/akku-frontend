import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      onLogin(username.trim(), userId, roomId.trim());
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Akkku</h1>
        <p>Enter your details to join a communication room</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="roomId">Room ID</label>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID (both users use same ID)"
              required
            />
          </div>
          <button type="submit" className="login-button">
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

