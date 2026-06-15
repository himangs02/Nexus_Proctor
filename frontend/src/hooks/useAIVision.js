import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as blazeface from '@tensorflow-models/blazeface';

export default function useAIVision({ enabled = false, onViolation }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const models = useRef({ coco: null, face: null });
  const intervalRef = useRef(null);
  const lastViolationTimes = useRef({});
  const onViolationRef = useRef(onViolation);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  // Load AI Models
  useEffect(() => {
    let isMounted = true;
    if (enabled && !modelsLoaded) {
      Promise.all([
        cocoSsd.load({ base: 'lite_mobilenet_v2' }),
        blazeface.load()
      ]).then(([coco, face]) => {
        if (isMounted) {
          models.current = { coco, face };
          setModelsLoaded(true);
        }
      }).catch(err => {
        console.error("Failed to load AI models:", err);
      });
    }
    return () => { isMounted = false; };
  }, [enabled, modelsLoaded]);

  const [cameraError, setCameraError] = useState(null);

  // Start Webcam (Triggered by user)
  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // Already initialized
    
    setCameraError(null);
    try {
      console.log("Requesting webcam permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user"
        },
        audio: false
      });
      console.log("Webcam permission granted");
      console.log("Webcam stream active");
      
      streamRef.current = stream;
      window.examCameraStream = stream; // Store globally as requested
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setStreamActive(true);
          } catch (e) {
            console.error("Video play failed:", e);
          }
        };
      }
    } catch (err) {
      console.error("Camera access denied or failed:", err);
      setCameraError(err.message || 'Camera permission denied');
      if (onViolationRef.current) onViolationRef.current('no_camera', 'critical', 'Camera access denied');
    }
  }, []);

  // Reattach stream if video element loses it
  useEffect(() => {
    if (!enabled) return;
    const checkStream = setInterval(() => {
      if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.warn('Play interrupted', e));
      }
    }, 1000);

    return () => clearInterval(checkStream);
  }, [enabled]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        window.examCameraStream = null;
      }
    };
  }, []);

  // AI Analysis Loop
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !models.current.coco || !models.current.face || videoRef.current.readyState !== 4) return;

    try {
      const video = videoRef.current;
      const currentAlerts = [];
      
      const canTrigger = (type, cooldownMs) => {
        const now = Date.now();
        if (!lastViolationTimes.current[type] || now - lastViolationTimes.current[type] > cooldownMs) {
          lastViolationTimes.current[type] = now;
          return true;
        }
        return false;
      };

      // Face Detection
      const faces = await models.current.face.estimateFaces(video, false);
      const faceCount = faces.length;
      console.log("Faces detected:", faceCount);

      if (faceCount === 0) {
        currentAlerts.push({ type: 'no_face', msg: 'No face detected in frame' });
        if (canTrigger('no_face', 10000)) {
          onViolationRef.current('no_face', 'high', 'No face detected in frame');
        }
      } else if (faceCount > 1) {
        currentAlerts.push({ type: 'multiple_faces', msg: `Detected ${faceCount} faces` });
        if (canTrigger('multiple_faces', 10000)) {
          onViolationRef.current('MULTIPLE_FACES', 'critical', `Detected ${faceCount} faces in frame`);
        }
      }

      // Object Detection
      const predictions = await models.current.coco.detect(video);
      const prohibited = ['cell phone', 'book', 'laptop'];
      
      predictions.forEach(p => {
        if (prohibited.includes(p.class) && p.score > 0.6) {
          currentAlerts.push({ type: 'prohibited_object', msg: `Detected: ${p.class}` });
          if (canTrigger('prohibited_object', 10000)) {
            onViolationRef.current('prohibited_object', 'critical', `Detected: ${p.class} (${Math.round(p.score * 100)}%)`);
          }
        }
      });

      setAlerts(currentAlerts);
    } catch (e) {
      console.error("AI Analysis Error:", e);
    }
  }, [onViolation]);

  useEffect(() => {
    if (enabled && modelsLoaded) {
      intervalRef.current = setInterval(analyzeFrame, 1500); // Analyze every 1.5 seconds
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, modelsLoaded, analyzeFrame]);

  const captureScreenshot = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320; // smaller width for transmission
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.5); // high compression
    } catch (e) {
      return null;
    }
  }, []);

  return { videoRef, modelsLoaded, alerts, captureScreenshot };
}
