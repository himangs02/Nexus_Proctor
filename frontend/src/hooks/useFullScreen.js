import { useState, useEffect, useCallback } from 'react';

export const useFullScreen = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const enterFullScreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error('Error attempting to enable fullscreen:', err);
    }
  }, []);

  const exitFullScreen = useCallback(async () => {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  return { isFullScreen, enterFullScreen, exitFullScreen };
};