import React, { useState, useEffect, useRef } from 'react';
import './ChatPanel.css';
import { compressImage, blobToBase64 } from '../utils/webrtc';

const ChatPanel = ({ socket, user, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingImage, setSendingImage] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Text message handler
    const handleTextMessage = (data) => {
      setMessages(prev => [...prev, {
        type: 'text',
        ...data,
        isOwn: data.userId === user.userId
      }]);
    };

    // Image message handler
    const handleImageMessage = (data) => {
      setMessages(prev => [...prev, {
        type: 'image',
        ...data,
        isOwn: data.userId === user.userId
      }]);
    };

    socket.on('text-message', handleTextMessage);
    socket.on('image-message', handleImageMessage);

    return () => {
      socket.off('text-message', handleTextMessage);
      socket.off('image-message', handleImageMessage);
    };
  }, [socket, user.userId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && socket) {
      socket.emit('text-message', {
        message: inputMessage.trim(),
        roomId,
        userId: user.userId,
        username: user.username
      });
      setInputMessage('');
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setSendingImage(true);
    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      const base64Data = await blobToBase64(compressedBlob);

      // Send image
      socket.emit('image-message', {
        imageData: base64Data,
        imageType: file.type,
        roomId,
        userId: user.userId,
        username: user.username
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending image:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setSendingImage(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Chat</h3>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.isOwn ? 'own-message' : 'other-message'}`}
            >
              {!msg.isOwn && (
                <div className="message-username">{msg.username}</div>
              )}
              <div className="message-content">
                {msg.type === 'text' ? (
                  <div className="message-text">{msg.message}</div>
                ) : (
                  <div className="message-image">
                    <img src={msg.imageData} alt="Shared" />
                  </div>
                )}
                <div className="message-time">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="image-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendingImage}
            title="Send Image"
          >
            {sendingImage ? '⏳' : '📷'}
          </button>
          <input
            type="text"
            className="message-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sendingImage}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || sendingImage}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;

