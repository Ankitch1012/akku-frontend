import React, { useState, useEffect, useRef } from 'react';
import './CommunicationRoom.css';
import VideoCall from './VideoCall';
import VoiceCall from './VoiceCall';
import ChatPanel from './ChatPanel';
import { getLocalStream, createPeerConnection } from '../utils/webrtc';

const CommunicationRoom = ({ socket, user, roomId, onLogout }) => {
  const [callType, setCallType] = useState(null); // 'video', 'voice', or null
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const targetSocketIdRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Join room
    socket.emit('join-room', { roomId, userId: user.userId });

    socket.on('joined-room', (data) => {
      console.log('Joined room:', data);
    });

    socket.on('user-joined', (data) => {
      console.log('User joined:', data);
      targetSocketIdRef.current = data.socketId;
      // If we have a call active, renegotiate
      if (callType && peerConnectionRef.current) {
        initiateCall();
      }
    });

    socket.on('user-left', (data) => {
      console.log('User left:', data);
      if (data.socketId === targetSocketIdRef.current) {
        handleHangup();
      }
    });

    // WebRTC Signaling handlers
    socket.on('offer', async (data) => {
      console.log('Received offer from:', data.fromSocketId);
      targetSocketIdRef.current = data.fromSocketId;
      await handleOffer(data);
    });

    socket.on('answer', async (data) => {
      console.log('Received answer from:', data.fromSocketId);
      await handleAnswer(data.answer);
    });

    socket.on('ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.fromSocketId);
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('call-control', (data) => {
      if (data.action === 'hangup') {
        handleHangup();
      }
    });

    socket.on('connection-quality-update', (data) => {
      setConnectionQuality(data.quality);
    });

    return () => {
      cleanup();
    };
  }, [socket, roomId, user.userId, callType]);

  // Update local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => {
        console.error('Error playing local video:', err);
      });
    } else if (localVideoRef.current && !localStream) {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream]);

  // Update remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => {
        console.error('Error playing remote video:', err);
      });
    } else if (remoteVideoRef.current && !remoteStream) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  const initiateCall = async () => {
    try {
      console.log('Initiating call, type:', callType);
      
      // Get local media
      const stream = await getLocalStream(true, callType === 'video');
      console.log('Got local stream:', stream);
      console.log('Audio tracks:', stream.getAudioTracks().length);
      console.log('Video tracks:', stream.getVideoTracks().length);
      
      setLocalStream(stream);

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind, track.enabled);
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote stream');
        setRemoteStream(event.streams[0]);
        setIsConnected(true);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && targetSocketIdRef.current) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            targetSocketId: targetSocketIdRef.current
          });
        }
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setConnectionQuality('good');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsConnected(false);
          setConnectionQuality('poor');
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (targetSocketIdRef.current) {
        socket.emit('offer', {
          offer: offer,
          targetSocketId: targetSocketIdRef.current,
          roomId
        });
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      let errorMessage = 'Failed to start call. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera and microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera or microphone found. Please connect a device.';
      } else {
        errorMessage += error.message || 'Please check your camera/microphone permissions.';
      }
      alert(errorMessage);
      setCallType(null);
    }
  };

  const handleOffer = async (data) => {
    try {
      const offer = data.offer || data;
      console.log('Handling offer, current callType:', callType);
      
      // Determine if this is a video call by checking SDP
      const isVideoCall = offer.sdp && offer.sdp.includes('video');
      const determinedCallType = isVideoCall ? 'video' : 'voice';
      
      // Set call type if not already set
      if (!callType) {
        setCallType(determinedCallType);
        console.log('Setting callType to:', determinedCallType);
      }
      
      const finalCallType = callType || determinedCallType;
      
      // Get local media if not already
      let currentStream = localStream;
      if (!currentStream) {
        currentStream = await getLocalStream(true, finalCallType === 'video');
        console.log('Got local stream for offer handling:', currentStream);
        setLocalStream(currentStream);
      }

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream tracks
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind, track.enabled);
          pc.addTrack(track, currentStream);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote stream in handleOffer:', event.streams);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setIsConnected(true);
          console.log('Remote stream tracks:', event.streams[0].getTracks());
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && targetSocketIdRef.current) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            targetSocketId: targetSocketIdRef.current
          });
        }
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsConnected(false);
        }
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        answer: answer,
        targetSocketId: targetSocketIdRef.current
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleStartVideoCall = () => {
    setCallType('video');
    setTimeout(() => initiateCall(), 100);
  };

  const handleStartVoiceCall = () => {
    setCallType('voice');
    setTimeout(() => initiateCall(), 100);
  };

  const handleHangup = () => {
    cleanup();
    setCallType(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    targetSocketIdRef.current = null;
  };

  const handleMuteToggle = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      const newMutedState = !isMuted;
      audioTracks.forEach(track => {
        track.enabled = newMutedState;
      });
      setIsMuted(newMutedState);
      socket.emit('call-control', {
        action: newMutedState ? 'mute' : 'unmute',
        roomId
      });
      console.log('Audio muted:', newMutedState);
    }
  };

  const handleVideoToggle = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      const newVideoState = !isVideoEnabled;
      videoTracks.forEach(track => {
        track.enabled = newVideoState;
      });
      setIsVideoEnabled(newVideoState);
      console.log('Video enabled:', newVideoState);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socket && callType) {
      socket.emit('call-control', { action: 'hangup', roomId });
    }
  };

  return (
    <div className="communication-room">
      <div className="room-header">
        <div className="room-info">
          <h2>Room: {roomId}</h2>
          <span className="username">User: {user.username}</span>
        </div>
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          {isConnected && (
            <span className={`quality-badge quality-${connectionQuality}`}>
              {connectionQuality}
            </span>
          )}
        </div>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="room-content">
        <div className="main-panel">
          {callType === 'video' && (
            <VideoCall
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              isConnected={isConnected}
              isMuted={isMuted}
              isVideoEnabled={isVideoEnabled}
              onMuteToggle={handleMuteToggle}
              onVideoToggle={handleVideoToggle}
              onHangup={handleHangup}
            />
          )}
          {callType === 'voice' && (
            <VoiceCall
              isConnected={isConnected}
              isMuted={isMuted}
              onMuteToggle={handleMuteToggle}
              onHangup={handleHangup}
            />
          )}
          {!callType && (
            <div className="call-selection">
              <h3>Start Communication</h3>
              <div className="call-buttons">
                <button className="call-button video-call" onClick={handleStartVideoCall}>
                  <span className="icon">📹</span>
                  Start Video Call
                </button>
                <button className="call-button voice-call" onClick={handleStartVoiceCall}>
                  <span className="icon">📞</span>
                  Start Voice Call
                </button>
              </div>
            </div>
          )}
        </div>

        <ChatPanel socket={socket} user={user} roomId={roomId} />
      </div>
    </div>
  );
};

export default CommunicationRoom;

