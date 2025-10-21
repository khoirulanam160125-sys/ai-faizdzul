import React from 'react';
import { InputMode } from '../types';

interface AgentPanelProps {
  isSessionActive: boolean;
  isInitializing: boolean;
  isAiThinking: boolean;
  onToggleSession: () => void;
  aiDetectionMessage: string;
  error: string | null;
  inputMode: InputMode;
  textPrompt: string;
  setTextPrompt: (prompt: string) => void;
}

const ThinkingIndicator = () => (
    <span className="inline-flex ml-2">
      <span style={{ animationDelay: '0ms' }} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
      <span style={{ animationDelay: '150ms' }} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce ml-1.5"></span>
      <span style={{ animationDelay: '300ms' }} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce ml-1.5"></span>
    </span>
);

const AgentPanel: React.FC<AgentPanelProps> = ({ 
  isSessionActive, 
  isInitializing, 
  isAiThinking,
  onToggleSession, 
  aiDetectionMessage, 
  error,
  inputMode,
  textPrompt,
  setTextPrompt
}) => {
  const isLiveMode = inputMode === InputMode.CAMERA || inputMode === InputMode.VOICE;
  const isTextMode = inputMode === InputMode.TEXT;

  const getStatusDisplay = () => {
    if (isInitializing) {
      return {
        text: 'CONNECTING',
        className: 'bg-yellow-500/20 text-yellow-300',
        dotClassName: 'bg-yellow-400',
        statusText: isTextMode ? 'Processing your request...' : 'Establishing connection...'
      };
    }
    if (isSessionActive) {
      return {
        text: 'ACTIVE',
        className: 'bg-green-500/20 text-green-300',
        dotClassName: 'bg-green-400',
        statusText: "I'm here to assist you"
      };
    }
    return {
      text: 'OFFLINE',
      className: 'bg-gray-500/20 text-gray-300',
      dotClassName: 'bg-gray-400',
      statusText: 'Offline. Ready to take action.'
    };
  };
  
  const getDetectionContent = () => {
    if (error) return <span className="text-red-400">{error}</span>;
    
    const message = aiDetectionMessage || (isSessionActive ? 'Listening and analyzing...' : 'No detection data.');
    
    return (
        <p className="text-gray-200 flex-grow whitespace-pre-wrap">
            {message}
            {isAiThinking && <ThinkingIndicator />}
        </p>
    );
  };


  const statusDisplay = getStatusDisplay();

  const getButtonText = () => {
    if (isInitializing) return (
      <span className="flex items-center justify-center">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {isTextMode ? 'Processing...' : 'Initializing...'}
      </span>
    );
    if (isLiveMode) {
      return isSessionActive ? 'End Action' : 'Take Action';
    }
    return 'Submit Prompt';
  };

  return (
    <div className="flex flex-col gap-6 h-full bg-[#1f2937] rounded-lg p-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-100">AI Agent</h2>
        <div className={`flex items-center gap-2 text-xs font-bold py-1 px-3 rounded-full ${statusDisplay.className}`}>
          <div className={`h-2 w-2 rounded-full ${statusDisplay.dotClassName}`}></div>
          {statusDisplay.text}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-1">Status</h3>
        <p className="text-gray-200 h-6">{error ? 'Error' : statusDisplay.statusText}</p>
      </div>

      <div className={`bg-[#111827] rounded-lg p-4 flex-grow flex items-start ${isTextMode ? 'font-mono text-sm' : ''}`}>
        {getDetectionContent()}
      </div>

      {inputMode === InputMode.TEXT && (
        <textarea
          value={textPrompt}
          onChange={(e) => setTextPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="w-full p-3 bg-[#111827] text-gray-200 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono"
          rows={3}
          disabled={isInitializing}
        />
      )}

      <div className="mt-auto">
        <button
          onClick={onToggleSession}
          disabled={isInitializing}
          className="w-full px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};

export default AgentPanel;