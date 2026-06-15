import { useState, useCallback } from 'react';

export const useScreenShare = () => {
  const [screenStream, setScreenStream] = useState(null);
  const [screenError, setScreenError] = useState(null);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false, 
      });
      
      stream.getVideoTracks()[0].onended = () => {
        // Candidate stopped sharing intentionally! Academic violation.
        stopScreenShare();
      };
      
      setScreenStream(stream);
      setScreenError(null);
    } catch (err) {
      setScreenError('Screen share denied. Testing protocol cannot proceed.');
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  }, [screenStream]);

  return { screenStream, screenError, startScreenShare, stopScreenShare };
};