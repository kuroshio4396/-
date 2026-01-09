import React, { useRef, useState } from 'react';
import { UserInputs, CharacterRole, Character, AISettings } from '../types';
import { analyzeFileContent } from '../services/geminiService';

interface InputFormProps {
  inputs: UserInputs;
  setInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onGenerate: () => void;
  isGenerating: boolean;
  aiSettings: AISettings;
}

const ROLES: CharacterRole[] = ['主角', '主要配角', '反派BOSS', '次要配角', '群演'];

// Declare mammoth as it's loaded via CDN
declare var mammoth: any;

const InputForm: React.FC<InputFormProps> = ({ inputs, setInputs, onGenerate, isGenerating, aiSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleChange = (field: keyof UserInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCharacter = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: '',
      description: '',
      role: '主角'
    };
    setInputs(prev => ({
      ...prev,
      characters: [...prev.characters, newChar]
    }));
  };

  const handleRemoveCharacter = (id: string) => {
    setInputs(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== id)
    }));
  };

  const handleCharacterChange = (id: string, field: keyof Character, value: string) => {
    setInputs(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
        let text = '';
        if (file.name.endsWith('.docx')) {
            // Use mammoth to extract raw text from docx
            if (typeof mammoth === 'undefined') {
                throw new Error("Mammoth library not loaded");
            }
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
        } else {
            // Assume text file
            text = await file.text();
        }

        if (!text.trim()) {
            alert("文件内容为空或无法识别");
            return;
        }

        const analysis = await analyzeFileContent(text, aiSettings);
        
        // Merge analysis results into inputs
        setInputs(prev => ({
            ...prev,
            worldSetting: analysis.worldSetting || prev.worldSetting,
            plotSnippets: analysis.plotSnippets || prev.plotSnippets,
            theme: analysis.theme || prev.theme,
            // Merge new characters with IDs
            characters: [
                ...prev.characters,
                ...(analysis.characters || []).map((c: any, i: number) => ({
                    id: `imported-${Date.now()}-${i}`,
                    name: c.name,
                    description: c.description,
                    role: c.role || '主要配角'
                }))
            ]
        }));
        
        alert("导入成功！AI已为您自动填入相关信息。");
    } catch (error) {
        console.error("Import failed:", error);
        alert("导入失败，请重试或检查文件格式（支持 .txt 和 .docx）。若使用 DeepSeek，请确保 Key 正确。");
    } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">输入灵感碎片</h2>
                <p className="text-gray-500 mt-1">告诉AI你的想法，或直接上传文档由AI自动分析。</p>
            </div>
            
            {/* AI Import Button */}
            <div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".txt,.docx" 
                    onChange={handleFileUpload}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting || isGenerating}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm border transition-all
                        ${isImporting 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                        }
                    `}
                >
                    {isImporting ? (
                         <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI分析中...
                         </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            AI 导入 (Word/Txt)
                        </>
                    )}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">世界观 / 故事背景</label>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none bg-gray-50 text-gray-800"
              placeholder="例如：赛博朋克风格的古代长安，或是被洪水淹没的未来地球..."
              value={inputs.worldSetting}
              onChange={(e) => handleChange('worldSetting', e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <label className="block text-sm font-semibold text-gray-700">角色人设</label>
               <button
                 onClick={handleAddCharacter}
                 className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-100 font-medium transition-colors flex items-center gap-1"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                 添加角色
               </button>
            </div>
            
            <div className="space-y-4">
              {inputs.characters.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm">
                   暂无角色，请点击上方“添加角色”按钮或使用“AI导入”功能
                </div>
              )}
              
              {inputs.characters.map((char, index) => (
                <div key={char.id} className="relative bg-gray-50 border border-gray-200 rounded-lg p-4 group transition-all hover:shadow-md hover:border-indigo-200">
                   {/* Remove Button */}
                   <button
                      onClick={() => handleRemoveCharacter(char.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="删除此角色"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>

                   <div className="flex items-center gap-3 mb-3 pr-8">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      
                      {/* Name Input */}
                      <input
                        type="text"
                        placeholder="角色名称"
                        value={char.name}
                        onChange={(e) => handleCharacterChange(char.id, 'name', e.target.value)}
                        className="font-bold text-gray-800 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:outline-none w-40 px-1 py-0.5"
                      />
                      
                      {/* Role Selector */}
                      <select
                        value={char.role}
                        onChange={(e) => handleCharacterChange(char.id, 'role', e.target.value as CharacterRole)}
                        className="text-xs bg-white border border-gray-300 text-gray-700 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                         {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                   </div>
                   
                   {/* Description Input */}
                   <textarea
                      placeholder="角色描述：性格、外貌、能力、关键经历等..."
                      value={char.description}
                      onChange={(e) => handleCharacterChange(char.id, 'description', e.target.value)}
                      className="w-full h-20 p-2 text-sm bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-none"
                   />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">初步剧情片段 / 关键情节</label>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none bg-gray-50 text-gray-800"
              placeholder="例如：主角在雨夜捡到一把会说话的枪，或者结尾必须是悲剧..."
              value={inputs.plotSnippets}
              onChange={(e) => handleChange('plotSnippets', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">核心主题 / 风格偏好 (选填)</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 text-gray-800"
              placeholder="例如：关于复仇，黑色幽默，克苏鲁神话..."
              value={inputs.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onGenerate}
            disabled={isGenerating || isImporting}
            className={`
              px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all transform hover:scale-105
              ${isGenerating || isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}
            `}
          >
            {isGenerating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在构思剧本...
              </span>
            ) : (
              '生成剧本规划'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputForm;
