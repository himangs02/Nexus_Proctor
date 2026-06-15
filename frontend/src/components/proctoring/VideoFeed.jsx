import React, { useEffect } from 'react';
import { useCamera } from '../../hooks/useCamera';

export const VideoFeed = () => {
  const { startCamera, videoRef, error } = useCamera();

  // Start the camera as soon as this component loads, ¡rápido!
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  return (
    <div className="bg-black p-4 rounded-xl border-2 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        🔴 Live Proctor Feed
      </h3>
      
      {error ? (
        <div className="bg-red-900/50 p-4 rounded text-red-200 font-mono">
          ¡Ay caramba! {error}
        </div>
      ) : (
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          className="w-full h-auto rounded-lg border border-gray-700 transform scale-x-[-1]" 
        />
      )}
    </div>
  );
};
