import React, { useState, useEffect } from 'react';
import { AISettings, AIProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AISettings;
  onSave: (settings: AISettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [provider, setProvider] = useState<AIProvider>(currentSettings.provider);
  const [apiKey, setApiKey] = useState(currentSettings.apiKey);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
        setProvider(currentSettings.provider);
        setApiKey(currentSettings.apiKey);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
        provider,
        apiKey,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                AI 模型配置
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        
        <div className="p-6 space-y-5">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">选择 AI 服务商</label>
                <div className="grid grid-cols-1 gap-3">
                    <button 
                        onClick={() => setProvider('default')}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${provider === 'default' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                    >
                        <div className="font-bold text-sm">默认 (Gemini Flash)</div>
                        <div className="text-xs opacity-75">使用内置的免费试用通道</div>
                    </button>
                    <button 
                        onClick={() => setProvider('gemini')}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${provider === 'gemini' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                    >
                        <div className="font-bold text-sm">Google Gemini (自选 Key)</div>
                        <div className="text-xs opacity-75">调用 gemini-2.5-pro 模型</div>
                    </button>
                    <button 
                        onClick={() => setProvider('deepseek')}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${provider === 'deepseek' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                    >
                        <div className="font-bold text-sm">DeepSeek (自选 Key)</div>
                        <div className="text-xs opacity-75">调用 deepseek-chat 模型</div>
                    </button>
                </div>
            </div>

            {provider !== 'default' && (
                <div className="space-y-2 animate-fadeIn">
                    <label className="block text-sm font-semibold text-gray-700">
                        {provider === 'gemini' ? 'Gemini API Key' : 'DeepSeek API Key'}
                    </label>
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={`sk-...`}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    />
                    <p className="text-xs text-gray-500">
                        您的 Key 仅存储在本地浏览器中，不会上传至任何第三方服务器。
                    </p>
                </div>
            )}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
            >
                取消
            </button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 text-sm text-white bg-indigo-600 font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
            >
                保存配置
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
