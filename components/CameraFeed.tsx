import React from 'react';
import { InputMode } from '../types';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isSessionActive: boolean;
  inputMode: InputMode;
  isMobile: boolean;
  onSwitchCamera: () => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ videoRef, canvasRef, isSessionActive, inputMode, isMobile, onSwitchCamera }) => {
  const showVideo = isSessionActive && inputMode === InputMode.CAMERA;

  const InactiveOverlay = () => {
    const isVoiceMode = inputMode === InputMode.VOICE;
    const isTextMode = inputMode === InputMode.TEXT;

    const Icon = () => {
      if (isVoiceMode) return <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-14 0m7 10v2m0 0v2m0-2h2m-2 0H9" /></svg>;
      if (isTextMode) return <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
    };
    
    const title = isVoiceMode ? 'Voice Only Mode' : isTextMode ? 'Text Input Mode' : 'Camera Inactive';

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-400 p-4">
        <Icon />
        <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
      </div>
    );
  };


  return (
    <div className="relative aspect-video bg-black w-full flex items-center justify-center overflow-hidden rounded-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover transition-opacity duration-300 ${showVideo ? 'opacity-100' : 'opacity-0'}`}
      ></video>
      
      {!showVideo && <InactiveOverlay />}

      <canvas ref={canvasRef} className="hidden"></canvas>
      
      {showVideo && (
        <>
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            Live Camera
          </div>
          {isMobile && (
            <button 
              onClick={onSwitchCamera}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
              aria-label="Switch camera"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default CameraFeed;