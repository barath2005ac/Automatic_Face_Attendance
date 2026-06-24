import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface FaceDetectionResult {
  descriptor: Float32Array;
  expressions: faceapi.FaceExpressions;
}

export function useFaceDetection() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        
        setIsModelLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading face detection models:', err);
        setError('Failed to load face detection models');
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please grant camera permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Detect face from video
  const detectFace = useCallback(async (): Promise<FaceDetectionResult | null> => {
    if (!videoRef.current || !isModelLoaded) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withFaceExpressions();

      if (detection) {
        return {
          descriptor: detection.descriptor,
          expressions: detection.expressions,
        };
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }

    return null;
  }, [isModelLoaded]);

  // Compare two face descriptors
  const compareFaces = useCallback((descriptor1: Float32Array, descriptor2: number[]): number => {
    const desc2 = new Float32Array(descriptor2);
    return faceapi.euclideanDistance(descriptor1, desc2);
  }, []);

  // Draw face detection overlay
  const drawDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks();

    if (detection && canvasRef.current) {
      const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
      const resizedDetection = faceapi.resizeResults(detection, dims);
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetection);
      }
    }
  }, [isModelLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isModelLoaded,
    isLoading,
    error,
    startCamera,
    stopCamera,
    detectFace,
    compareFaces,
    drawDetection,
  };
}
