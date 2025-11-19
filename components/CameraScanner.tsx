import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Aperture } from 'lucide-react';

interface Props {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export const CameraScanner: React.FC<Props> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.");
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(imageSrc);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
         <button onClick={onClose} className="text-white p-2 bg-gray-800 rounded-full">
           <X className="w-6 h-6" />
         </button>
      </div>

      {error ? (
        <div className="text-red-500 px-4 text-center">{error}</div>
      ) : (
        <div className="relative w-full h-full flex flex-col">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-10 left-0 right-0 flex justify-center pb-8">
             <button 
              onClick={takePhoto}
              className="bg-white rounded-full p-4 shadow-lg active:scale-95 transition-transform border-4 border-gray-300"
             >
               <Aperture className="w-8 h-8 text-blue-600" />
             </button>
          </div>
          <div className="absolute top-10 left-0 right-0 text-center pointer-events-none">
             <span className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
               Gerät oder Batterie scannen
             </span>
          </div>
        </div>
      )}
    </div>
  );
};