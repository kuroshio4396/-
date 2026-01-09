import React, { useState, useEffect } from 'react';
import { UserInputs, ScriptPlan, ScriptAct, AppView, AISettings } from './types';
import { generateScriptPlans, extendScriptStructure } from './services/geminiService';
import InputForm from './components/InputForm';
import PlanSelection from './components/PlanSelection';
import OutlineView from './components/OutlineView';
import StructureEditor from './components/StructureEditor';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('input');
  
  // Settings State
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: 'default',
    apiKey: '',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load Settings from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai_script_settings');
    if (saved) {
        try {
            setAiSettings(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    }
  }, []);

  // Save Settings
  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    localStorage.setItem('ai_script_settings', JSON.stringify(newSettings));
  };

  // State for user inputs
  const [inputs, setInputs] = useState<UserInputs>({
    worldSetting: '',
    characters: [],
    plotSnippets: '',
    theme: ''
  });

  // State for generated content
  const [generatedPlans, setGeneratedPlans] = useState<ScriptPlan[]>([]);
  const [savedOutline, setSavedOutline] = useState<ScriptPlan | null>(null);
  
  // Loading and History state
  const [isGenerating, setIsGenerating] = useState(false);
  const [rejectedTitles, setRejectedTitles] = useState<string[]>([]);

  const handleGenerate = async (isRedo: boolean = false) => {
    if (!inputs.worldSetting && inputs.characters.length === 0 && !inputs.plotSnippets && !inputs.theme) {
      alert("请输入至少一项灵感内容。");
      return;
    }

    setIsGenerating(true);
    try {
      const titlesToAvoid = isRedo 
        ? [...rejectedTitles, ...generatedPlans.map(p => p.title)]
        : [];
      
      if (isRedo) {
        setRejectedTitles(titlesToAvoid);
      } else {
        setRejectedTitles([]);
      }

      const newPlans = await generateScriptPlans(inputs, titlesToAvoid, aiSettings);
      setGeneratedPlans(newPlans);
      setCurrentView('selection');
    } catch (error) {
      console.error(error);
      alert("生成失败，请检查网络设置、API Key 是否正确，或稍后再试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPlan = (plan: ScriptPlan) => {
    setSavedOutline(plan);
    setCurrentView('outline');
  };

  const handleUpdateOutline = (updatedPlan: ScriptPlan) => {
      setSavedOutline(updatedPlan);
  };

  const handleUpdateActs = (newActs: ScriptAct[]) => {
      if (savedOutline) {
          setSavedOutline({ ...savedOutline, acts: newActs });
      }
  };

  const handleGenerateNextActs = async () => {
      if (!savedOutline) return;
      
      setIsGenerating(true);
      try {
          const newActs = await extendScriptStructure(savedOutline, inputs, aiSettings);
          const updatedActs = [...savedOutline.acts, ...newActs];
          setSavedOutline({ ...savedOutline, acts: updatedActs });
      } catch (error) {
          console.error(error);
          alert("续写失败，请检查配置或稍后再试。");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleClearOutline = () => {
      if(window.confirm("确定要删除当前大纲吗？")) {
          setSavedOutline(null);
          setCurrentView('selection');
      }
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="flex-shrink-0 flex items-center gap-2">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="font-bold text-xl tracking-tight text-gray-800">灵感剧本规划器</span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex space-x-2 items-center">
                  <button
                    onClick={() => setCurrentView('input')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'input' 
                        ? 'text-indigo-600 bg-indigo-50' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    1. 灵感输入
                  </button>
                   <button
                    onClick={() => {
                        if (generatedPlans.length > 0) setCurrentView('selection');
                    }}
                    disabled={generatedPlans.length === 0}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'selection'
                        ? 'text-indigo-600 bg-indigo-50' 
                        : generatedPlans.length > 0 ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    2. 构思规划
                  </button>
                  <button
                    onClick={() => savedOutline && setCurrentView('outline')}
                    disabled={!savedOutline}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'outline' || currentView === 'structure_editor'
                        ? 'text-indigo-600 bg-indigo-50' 
                        : savedOutline ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    3. 剧本大纲
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-300 mx-2 hidden md:block"></div>

                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
                    title="配置 API 秘钥"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="hidden sm:inline text-sm font-medium">配置 AI</span>
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {currentView === 'input' && (
          <InputForm 
            inputs={inputs} 
            setInputs={setInputs} 
            onGenerate={() => handleGenerate(false)} 
            isGenerating={isGenerating} 
            aiSettings={aiSettings}
          />
        )}

        {currentView === 'selection' && (
          <PlanSelection 
            plans={generatedPlans} 
            onSelect={handleSelectPlan} 
            onRedo={() => handleGenerate(true)}
            isGenerating={isGenerating}
            onBack={() => setCurrentView('input')}
          />
        )}

        {currentView === 'outline' && savedOutline && (
            <OutlineView 
                plan={savedOutline} 
                onClear={handleClearOutline}
                onUpdate={handleUpdateOutline}
                onEditStructure={() => setCurrentView('structure_editor')}
            />
        )}

        {currentView === 'structure_editor' && savedOutline && (
            <StructureEditor
                plan={savedOutline}
                inputs={inputs}
                onUpdateActs={handleUpdateActs}
                onGenerateNext={handleGenerateNextActs}
                isGenerating={isGenerating}
                onBack={() => setCurrentView('outline')}
                aiSettings={aiSettings}
            />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-400">
            Powered by {aiSettings.provider === 'deepseek' ? 'DeepSeek V3' : aiSettings.provider === 'gemini' ? 'Gemini 2.5 Pro' : 'Gemini Flash'} | 灵感剧本规划器 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentSettings={aiSettings} 
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;
