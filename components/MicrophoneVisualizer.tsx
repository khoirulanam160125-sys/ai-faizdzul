import React, { useEffect, useRef, useState } from 'react';

interface MicrophoneVisualizerProps {
  isSessionActive: boolean;
  mediaStreamRef: React.RefObject<MediaStream | null>;
}

const MicrophoneIcon = () => (
    <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V24h2v-3.06A9 9 0 0 0 21 12v-2h-2z" fill="currentColor"/>
    </svg>
);

const MicrophoneVisualizer: React.FC<MicrophoneVisualizerProps> = ({ isSessionActive, mediaStreamRef }) => {
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (isSessionActive && mediaStreamRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Small FFT size for fewer bars
      
      const source = audioContext.createMediaStreamSource(mediaStreamRef.current);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setAudioData(new Uint8Array(analyser.frequencyBinCount));

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      
      const draw = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioData(new Uint8Array(dataArray));
          animationFrameRef.current = requestAnimationFrame(draw);
        }
      };
      
      draw();

    } else {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      setAudioData(new Uint8Array(0));
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSessionActive, mediaStreamRef]);

  const bars = Array.from(audioData).slice(0, 20); // Use first 20 bars

  return (
    <div className="bg-[#1f2937] rounded-lg p-6 flex items-center gap-6">
      <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${isSessionActive ? 'bg-green-500' : 'bg-gray-700'}`}>
        <MicrophoneIcon />
      </div>
      <div className="flex-grow flex items-center gap-1 h-12">
        {isSessionActive ? bars.map((value, i) => (
          <div
            key={i}
            className="w-full bg-green-400 rounded-full"
            style={{ 
                height: `${Math.max(2, (value / 255) * 100)}%`,
                transition: 'height 0.1s ease-out' 
            }}
          />
        )) : Array(20).fill(0).map((_, i) => (
             <div key={i} className="w-full bg-gray-600 rounded-full" style={{ height: '2px' }} />
        ))}
      </div>
    </div>
  );
};

export default MicrophoneVisualizer;
