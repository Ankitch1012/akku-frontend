import React from 'react';
import './VideoCall.css';

const VideoCall = ({
  localVideoRef,
  remoteVideoRef,
  isConnected,
  isMuted,
  isVideoEnabled,
  onMuteToggle,
  onVideoToggle,
  onHangup
}) => {
  return (
    <div className="video-call-container">
      <div className="video-grid">
        <div className="video-wrapper remote-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-element"
          />
          {!isConnected && (
            <div className="video-placeholder">
              <span>Waiting for remote user...</span>
            </div>
          )}
        </div>
        <div className="video-wrapper local-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-element"
            style={{ display: isVideoEnabled ? 'block' : 'none' }}
          />
          {!isVideoEnabled && (
            <div className="video-overlay">
              <span>📷</span>
              <p>Camera Off</p>
            </div>
          )}
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
          className={`control-button ${!isVideoEnabled ? 'disabled' : ''}`}
          onClick={onVideoToggle}
          title={isVideoEnabled ? 'Disable Video' : 'Enable Video'}
        >
          {isVideoEnabled ? '📹' : '📷'}
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

export default VideoCall;

