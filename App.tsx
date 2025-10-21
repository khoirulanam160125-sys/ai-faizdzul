import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AgentType, InputMode, TargetOS, LLMModel } from './types';
import CameraFeed from './components/CameraFeed';
import AgentPanel from './components/AgentPanel';
import MicrophoneVisualizer from './components/MicrophoneVisualizer';
import ControlPanel from './components/ControlPanel';
import { encode, decode, decodeAudioData, blobToBase64 } from './utils/audio';

const FRAME_RATE = 2; // Send 2 frames per second
const JPEG_QUALITY = 0.7;

const getSystemInstruction = (agent: AgentType): string => {
  switch (agent) {
    case AgentType.TUTOR:
      return "You are an AI Tutor named Faizdzul. Your goal is to help the user learn. Explain concepts clearly, use analogies, be patient, and ask probing questions to check for understanding. Your responses will be spoken out loud.";
    case AgentType.SOCIAL:
      return "You are a social media intelligence analyst named Faizdzul. You cannot directly access the internet. Based on the user's vocal request, describe a detailed, step-by-step strategy for gathering information from social media platforms like Twitter, Instagram, or LinkedIn. Your responses will be spoken out loud.";
    case AgentType.DEVELOPER:
      return "You are an expert AI developer agent named Faizdzul, specializing in automation workflows like n8n, AgentKit, and Docker. Analyze the user's request. Provide code snippets in markdown, CLI commands, or structured JSON plans. Your primary goal is to generate actionable, technical content. Your responses will be spoken out loud.";
    case AgentType.BROWSER:
      return "You are a 'Browser-Use' agent in Super Beta mode, named Faizdzul. Your primary function is to browse the web using Google Search to answer user queries with the most up-to-date information available. When you use search, clearly state that you are accessing the web. Your responses will be spoken out loud.";
    case AgentType.ASSISTANT:
    default:
      return "You are a real-time AI assistant named Faizdzul. Analyze the live video and audio stream to describe what you see or answer the user's questions. Provide information, tell short stories, or summarize recent news. Be concise and descriptive. Your responses will be spoken out loud.";
  }
};

const App: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiDetectionMessage, setAiDetectionMessage] = useState('');
  
  // New state for controls
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(AgentType.ASSISTANT);
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.CAMERA);
  const [targetOS, setTargetOS] = useState<TargetOS>(TargetOS.DESKTOP);
  const [selectedLLM, setSelectedLLM] = useState<LLMModel>(LLMModel.PRO);
  const [textPrompt, setTextPrompt] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentOutputTranscriptionRef = useRef('');
  const nextAudioStartTimeRef = useRef(0);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const isSessionActiveRef = useRef(false);

  useEffect(() => {
    if (!process.env.API_KEY || process.env.API_KEY.trim() === '') {
      setErrorMessage('A Google AI API Key has not been provided.');
    }
  }, []);

  const stopSession = useCallback((errorMsg?: string) => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = null;
    
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    // Disconnect and release audio processing nodes to prevent memory leaks.
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    audioContextRef.current?.close().catch(console.error);
    audioContextRef.current = null;
    
    // Stop all queued audio sources and close the output context.
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;

    setIsSessionActive(false);
    isSessionActiveRef.current = false;
    setIsInitializing(false);
    setIsProcessing(false);
    setIsAiThinking(false);
    if(errorMsg) setErrorMessage(errorMsg);

  }, []);
  
  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    if (message.serverContent?.outputTranscription) {
      setIsAiThinking(true);
      currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
      setAiDetectionMessage(currentOutputTranscriptionRef.current);
    }
    if (message.serverContent?.turnComplete) {
      currentOutputTranscriptionRef.current = '';
      setIsAiThinking(false);
    }
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && outputAudioContextRef.current) {
      const ctx = outputAudioContextRef.current;
      // Decode first to handle the async part, which is the most time-consuming
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      
      // After decoding, check if the session is still active before scheduling playback.
      // This prevents audio from playing after the user has already stopped the session.
      if (!isSessionActiveRef.current) return;

      // Synchronously schedule the audio to play. This logic is now robust against race conditions.
      const currentTime = ctx.currentTime;
      const startTime = Math.max(nextAudioStartTimeRef.current, currentTime);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
      
      source.start(startTime);
      
      // Update the cursor for the next audio chunk to ensure seamless playback.
      nextAudioStartTimeRef.current = startTime + audioBuffer.duration;
      audioSourcesRef.current.add(source);
    }
    if(message.serverContent?.interrupted){
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextAudioStartTimeRef.current = 0;
    }
  }, []);
  
  const toggleCameraFacingMode = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // If session is active, restart it with the new camera
    if (isSessionActive) {
      stopSession();
      // A slight delay to allow devices to release the camera
      setTimeout(() => startSession(), 100);
    }
  }

  const startSession = useCallback(async () => {
    if (inputMode === InputMode.TEXT) return; // Not for text mode
    if (!process.env.API_KEY) {
        setErrorMessage('Cannot start session: API Key is missing.');
        return;
    }
    setIsInitializing(true);
    setErrorMessage(null);
    setAiDetectionMessage('');
    setIsAiThinking(false);

    try {
      // Stop any existing tracks before starting a new stream
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      
      const constraints = { 
        audio: true, 
        video: inputMode === InputMode.CAMERA ? { facingMode: cameraFacingMode } : false 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current && inputMode === InputMode.CAMERA) {
        videoRef.current.srcObject = stream;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const OutputAudioContext = window.AudioContext || (window as any).webkitAudioContext;
      outputAudioContextRef.current = new OutputAudioContext({sampleRate: 24000});
      nextAudioStartTimeRef.current = 0;
      audioSourcesRef.current.clear();

      const systemInstruction = getSystemInstruction(selectedAgent);
      
      const config: any = {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: systemInstruction,
      };
      
      if (selectedAgent === AgentType.DEVELOPER || selectedAgent === AgentType.BROWSER) {
        config.tools = [{googleSearch: {}}];
      }

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const InputAudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new InputAudioContext({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = {
                  data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                  mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current.destination);
            
            if (inputMode === InputMode.CAMERA) {
                frameIntervalRef.current = window.setInterval(() => {
                    if (videoRef.current && canvasRef.current) {
                        const video = videoRef.current;
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        if (ctx && video.videoWidth > 0) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                            canvas.toBlob(async (blob) => {
                                if (blob) {
                                    const base64Data = await blobToBase64(blob);
                                    sessionPromiseRef.current?.then((session) => {
                                        session.sendRealtimeInput({
                                            media: { data: base64Data, mimeType: 'image/jpeg' }
                                        });
                                    });
                                }
                            }, 'image/jpeg', JPEG_QUALITY);
                        }
                    }
                }, 1000 / FRAME_RATE);
            }
            
            setIsInitializing(false);
            setIsSessionActive(true);
            isSessionActiveRef.current = true;
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            if (!isSessionActiveRef.current) return;
            console.error('Session error:', e);
            stopSession(`An error occurred: ${e.message}.`);
          },
          onclose: () => {
            if (!isSessionActiveRef.current) return;
            console.log('Session closed.');
            stopSession();
          },
        },
        config: config,
      });

    } catch (err) {
      console.error(err);
      const error = err as Error;
      stopSession(`Failed to start session: ${error.message}`);
    }
  }, [handleMessage, stopSession, selectedAgent, inputMode, cameraFacingMode]);

  const handleTextPromptSubmit = async () => {
    if (!textPrompt.trim() || !process.env.API_KEY) {
      setErrorMessage(textPrompt.trim() ? 'API Key is missing.' : 'Please enter a prompt.');
      return;
    }
    setIsProcessing(true);
    setIsAiThinking(true);
    setErrorMessage(null);
    setAiDetectionMessage('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const config: any = {};
      if (selectedAgent === AgentType.DEVELOPER || selectedAgent === AgentType.BROWSER) {
        config.tools = [{googleSearch: {}}];
      }

      const response = await ai.models.generateContent({
        model: selectedLLM,
        contents: textPrompt,
        config: {
          ...config,
          systemInstruction: getSystemInstruction(selectedAgent)
        },
      });

      setAiDetectionMessage(response.text);

    } catch (err) {
       console.error(err);
       const error = err as Error;
       setErrorMessage(`Request failed: ${error.message}`);
    } finally {
       setIsProcessing(false);
       setIsAiThinking(false);
    }
  };


  const handleToggleSession = () => {
    if (inputMode === InputMode.TEXT) {
      handleTextPromptSubmit();
    } else {
      if (isSessionActive || isInitializing) {
        stopSession();
      } else {
        startSession();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-7xl mx-auto bg-[#1f2937] border border-[#374151] rounded-xl shadow-2xl shadow-black/50 p-6">
        <div className="bg-[#111827] rounded-lg p-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-100">AI Faizdzul Agency</h1>
          </header>
          
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-5 flex flex-col gap-6">
                <CameraFeed
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  isSessionActive={isSessionActive}
                  inputMode={inputMode}
                  isMobile={targetOS === TargetOS.IOS || targetOS === TargetOS.ANDROID}
                  onSwitchCamera={toggleCameraFacingMode}
                />
                <MicrophoneVisualizer isSessionActive={isSessionActive && inputMode !== InputMode.TEXT} mediaStreamRef={mediaStreamRef} />
            </div>
            
            <div className="lg:col-span-7 flex flex-col gap-6">
               <ControlPanel
                  selectedAgent={selectedAgent}
                  setSelectedAgent={setSelectedAgent}
                  inputMode={inputMode}
                  setInputMode={setInputMode}
                  targetOS={targetOS}
                  setTargetOS={setTargetOS}
                  selectedLLM={selectedLLM}
                  setSelectedLLM={setSelectedLLM}
                  isSessionActive={isSessionActive}
               />
               <AgentPanel
                  isSessionActive={isSessionActive}
                  isInitializing={isInitializing || isProcessing}
                  isAiThinking={isAiThinking}
                  onToggleSession={handleToggleSession}
                  aiDetectionMessage={aiDetectionMessage}
                  error={errorMessage}
                  inputMode={inputMode}
                  textPrompt={textPrompt}
                  setTextPrompt={setTextPrompt}
                />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;