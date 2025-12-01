// WebRTC utility functions

export const getLocalStream = async (audio = true, video = true) => {
  try {
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported in this browser');
    }

    const constraints = {
      audio: audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      } : false,
      video: video ? {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 },
        facingMode: 'user'
      } : false
    };

    console.log('Requesting media with constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Verify stream has tracks
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    console.log('Stream obtained - Audio tracks:', audioTracks.length, 'Video tracks:', videoTracks.length);
    
    if (audio && audioTracks.length === 0) {
      console.warn('No audio tracks in stream');
    }
    if (video && videoTracks.length === 0) {
      console.warn('No video tracks in stream');
    }
    
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw error;
  }
};

export const createPeerConnection = (config = {}) => {
  const defaultConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const pcConfig = { ...defaultConfig, ...config };
  const peerConnection = new RTCPeerConnection(pcConfig);

  return peerConnection;
};

export const createDataChannel = (peerConnection, label = 'dataChannel') => {
  const dataChannel = peerConnection.createDataChannel(label, {
    ordered: true
  });

  return dataChannel;
};

// Compress image before sending
export const compressImage = (file, maxWidth = 1280, maxHeight = 720, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// Convert blob to base64 for transmission
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

