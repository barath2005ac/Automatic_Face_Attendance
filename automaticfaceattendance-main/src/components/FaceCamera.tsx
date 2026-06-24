import { useEffect, useState, useCallback } from 'react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaceCameraProps {
  onFaceDetected?: (descriptor: Float32Array) => void;
  onCapture?: (descriptor: Float32Array) => void;
  mode?: 'detect' | 'register';
  className?: string;
}

export function FaceCamera({ 
  onFaceDetected, 
  onCapture, 
  mode = 'detect',
  className 
}: FaceCameraProps) {
  const {
    videoRef,
    canvasRef,
    isModelLoaded,
    isLoading,
    error,
    startCamera,
    stopCamera,
    detectFace,
    drawDetection,
  } = useFaceDetection();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'none' | 'detecting' | 'found'>('none');
  const [lastDescriptor, setLastDescriptor] = useState<Float32Array | null>(null);

  // Start camera when component mounts and models are loaded
  useEffect(() => {
    if (isModelLoaded && !isCameraActive) {
      handleStartCamera();
    }
  }, [isModelLoaded]);

  const handleStartCamera = async () => {
    await startCamera();
    setIsCameraActive(true);
  };

  const handleStopCamera = () => {
    stopCamera();
    setIsCameraActive(false);
    setFaceStatus('none');
  };

  // Continuous face detection loop
  useEffect(() => {
    let animationId: number;
    let detectionInterval: NodeJS.Timeout;

    if (isCameraActive && isModelLoaded) {
      // Draw detection overlay
      const drawLoop = () => {
        drawDetection();
        animationId = requestAnimationFrame(drawLoop);
      };
      drawLoop();

      // Detect face every 500ms
      detectionInterval = setInterval(async () => {
        setFaceStatus('detecting');
        const result = await detectFace();
        
        if (result) {
          setFaceStatus('found');
          setLastDescriptor(result.descriptor);
          onFaceDetected?.(result.descriptor);
        } else {
          setFaceStatus('none');
          setLastDescriptor(null);
        }
      }, 500);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [isCameraActive, isModelLoaded, drawDetection, detectFace, onFaceDetected]);

  const handleCapture = useCallback(() => {
    if (lastDescriptor) {
      onCapture?.(lastDescriptor);
    }
  }, [lastDescriptor, onCapture]);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-12 glass-card rounded-xl", className)}>
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-foreground">Loading Face Detection Models...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-12 glass-card rounded-xl", className)}>
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium text-foreground">Error</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
        <Button onClick={handleStartCamera} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Camera Feed */}
      <div className="relative camera-feed">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-lg rounded-xl"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Status Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm transition-all duration-300",
            faceStatus === 'found' ? "bg-success/90 text-success-foreground" :
            faceStatus === 'detecting' ? "bg-warning/90 text-warning-foreground" :
            "bg-muted/90 text-muted-foreground"
          )}>
            {faceStatus === 'found' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Face Detected</span>
              </>
            ) : faceStatus === 'detecting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Scanning...</span>
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                <span className="text-sm font-medium">No Face Detected</span>
              </>
            )}
          </div>

          {/* Pulse ring when face detected */}
          {faceStatus === 'found' && (
            <div className="h-4 w-4 rounded-full bg-success pulse-ring" />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-6">
        {isCameraActive ? (
          <>
            <Button variant="outline" onClick={handleStopCamera}>
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Camera
            </Button>
            {mode === 'register' && (
              <Button 
                onClick={handleCapture}
                disabled={faceStatus !== 'found'}
                className="bg-primary hover:bg-primary/90"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Face
              </Button>
            )}
          </>
        ) : (
          <Button onClick={handleStartCamera}>
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        )}
      </div>
    </div>
  );
}
