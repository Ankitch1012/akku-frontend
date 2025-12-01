import React from 'react';
import './VoiceCall.css';

const VoiceCall = ({
  isConnected,
  isMuted,
  onMuteToggle,
  onHangup
}) => {
  return (
    <div className="voice-call-container">
      <div className="voice-call-content">
        <div className="avatar-circle">
          <span className="avatar-icon">👤</span>
        </div>
        <div className="call-status">
          <h3>{isConnected ? 'Call Connected' : 'Connecting...'}</h3>
          <p>Voice Call Active</p>
        </div>
      </div>
      <div className="call-controls">
        <button
          className={`control-button ${isMuted ? 'muted' : ''}`}
          onClick={onMuteToggle}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>
        <button
          className="control-button hangup"
          onClick={onHangup}
          title="Hang Up"
        >
          📞
        </button>
      </div>
    </div>
  );
};

export default VoiceCall;

