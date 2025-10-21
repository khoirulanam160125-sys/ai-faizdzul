import React from 'react';
import { AgentType, InputMode, TargetOS, LLMModel } from '../types';

interface ControlPanelProps {
  selectedAgent: AgentType;
  setSelectedAgent: (agent: AgentType) => void;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  targetOS: TargetOS;
  setTargetOS: (os: TargetOS) => void;
  selectedLLM: LLMModel;
  setSelectedLLM: (model: LLMModel) => void;
  isSessionActive: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedAgent,
  setSelectedAgent,
  inputMode,
  setInputMode,
  targetOS,
  setTargetOS,
  selectedLLM,
  setSelectedLLM,
}) => {

  const agentOptions = [
    { id: AgentType.ASSISTANT, title: 'Asisten Agensi' },
    { id: AgentType.TUTOR, title: 'AI Dosen' },
    { id: AgentType.SOCIAL, title: 'Pencari Sosial' },
    { id: AgentType.DEVELOPER, title: 'Pengembang Agensi' },
    { id: AgentType.BROWSER, title: 'Browser-Use (Beta)' },
  ];

  const inputModeOptions = [
    { id: InputMode.CAMERA, title: 'Kamera Langsung' },
    { id: InputMode.VOICE, title: 'Hanya Suara' },
    { id: InputMode.TEXT, title: 'Prompt Teks' },
  ];

  const osOptions = [
    { id: TargetOS.DESKTOP, title: 'Desktop' },
    { id: TargetOS.IOS, title: 'iOS' },
    { id: TargetOS.ANDROID, title: 'Android' },
  ];
  
  const llmOptions = [
      { id: LLMModel.FLASH, title: 'Gemini 2.5 Flash' },
      { id: LLMModel.PRO, title: 'Gemini 2.5 Pro' },
  ];

  const ControlSection = ({ title, children, disabled = false, helperText }: { title: string, children: React.ReactNode, disabled?: boolean, helperText?: React.ReactNode }) => (
    <div className={`transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="text-sm font-semibold text-gray-400">{title}</h3>
        {helperText}
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );

  const OptionButton = ({ title, isSelected, onClick }: { title: string, isSelected: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`
            px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-200
            ${isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-[#1f2937] border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'}
        `}
    >
        {title}
    </button>
  );


  return (
    <div className="bg-[#111827] rounded-lg p-5">
      <h2 className="text-xl font-bold text-gray-100 mb-6">Control Panel</h2>
      <div className="flex flex-col gap-6">
        <ControlSection title="Pilih Agen AI">
          {agentOptions.map(opt => 
            <OptionButton
              key={opt.id} 
              title={opt.title}
              isSelected={selectedAgent === opt.id} 
              onClick={() => setSelectedAgent(opt.id)} 
            />
          )}
        </ControlSection>

        <ControlSection title="Mode Input">
          {inputModeOptions.map(opt => 
            <OptionButton
              key={opt.id} 
              title={opt.title}
              isSelected={inputMode === opt.id} 
              onClick={() => setInputMode(opt.id)} 
            />
          )}
        </ControlSection>

        <ControlSection title="Perangkat Target">
          {osOptions.map(opt => 
            <OptionButton
              key={opt.id} 
              title={opt.title}
              isSelected={targetOS === opt.id} 
              onClick={() => setTargetOS(opt.id)} 
            />
          )}
        </ControlSection>
        
        <ControlSection 
          title="Model LLM" 
          disabled={inputMode !== InputMode.TEXT}
          helperText={
            inputMode !== InputMode.TEXT && <span className="text-xs text-gray-500">Hanya tersedia dalam Mode Teks</span>
          }
        >
          {llmOptions.map(opt => 
            <OptionButton
              key={opt.id} 
              title={opt.title}
              isSelected={selectedLLM === opt.id} 
              onClick={() => setSelectedLLM(opt.id)} 
            />
          )}
        </ControlSection>
      </div>
    </div>
  );
};

export default ControlPanel;