import React, { useState, useRef } from 'react';
import { ScriptPlan, ScriptAct, UserInputs, AISettings } from '../types';
import { refineScriptAct, splitScriptAct } from '../services/geminiService';

interface StructureEditorProps {
  plan: ScriptPlan;
  inputs: UserInputs;
  onUpdateActs: (newActs: ScriptAct[]) => void;
  onGenerateNext: () => void;
  isGenerating: boolean;
  onBack: () => void;
  aiSettings: AISettings;
}

const StructureEditor: React.FC<StructureEditorProps> = ({ 
    plan, 
    inputs,
    onUpdateActs, 
    onGenerateNext, 
    isGenerating,
    onBack,
    aiSettings
}) => {
  // Track which act is currently being processed by "Refine" or "Split"
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleActChange = (index: number, field: keyof ScriptAct, value: string) => {
    const newActs = [...plan.acts];
    newActs[index] = { ...newActs[index], [field]: value };
    onUpdateActs(newActs);
  };

  const handleDeleteAct = (index: number) => {
    if (window.confirm("确定要删除这个节点吗？")) {
        const newActs = plan.acts.filter((_, i) => i !== index);
        onUpdateActs(newActs);
    }
  };

  const handleAddAct = () => {
    const newActs = [...plan.acts, { 
        id: Math.random().toString(36).substr(2, 9), 
        title: "新情节节点", 
        description: "" 
    }];
    onUpdateActs(newActs);
  };

  const handleRefineAct = async (index: number) => {
    if (processingIndex !== null) return;
    setProcessingIndex(index);
    try {
        const targetAct = plan.acts[index];
        const previousActs = plan.acts.slice(0, index);
        const refinedDescription = await refineScriptAct(
            targetAct, 
            previousActs, 
            { title: plan.title, tone: plan.tone },
            inputs,
            aiSettings
        );
        handleActChange(index, 'description', refinedDescription);
    } catch (error) {
        alert("细化失败，请重试。如使用自定义 Key，请检查配置。");
    } finally {
        setProcessingIndex(null);
    }
  };

  const handleSplitAct = async (index: number) => {
    if (processingIndex !== null) return;
    setProcessingIndex(index);
    try {
        const targetAct = plan.acts[index];
        const previousActs = plan.acts.slice(0, index);
        const newSubActs = await splitScriptAct(
            targetAct,
            previousActs,
            { title: plan.title, tone: plan.tone },
            inputs,
            aiSettings
        );
        
        // Replace the single act with the new array of acts
        const newActs = [...plan.acts];
        newActs.splice(index, 1, ...newSubActs);
        onUpdateActs(newActs);

    } catch (error) {
        alert("拆分失败，请重试。如使用自定义 Key，请检查配置。");
    } finally {
        setProcessingIndex(null);
    }
  };

  // --- TXT Import/Export Logic ---

  const handleExportTxt = () => {
      let content = `=== 剧本大纲: ${plan.title} ===\n`;
      content += `风格: ${plan.tone}\n`;
      content += `核心冲突: ${plan.mainConflict}\n\n`;
      content += `=== 剧情结构详情 ===\n\n`;

      plan.acts.forEach((act, index) => {
          content += `第 ${index + 1} 幕: ${act.title}\n`;
          content += `-------------------\n`;
          content += `${act.description}\n\n`;
          content += `===================\n\n`;
      });

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plan.title}-structure.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          
          // Reset file input immediately to allow re-selection of the same file
          if (fileInputRef.current) fileInputRef.current.value = '';

          if (!text) return;

          if (!window.confirm("警告：此操作将【彻底清空】当前编辑器内的所有节点，并使用导入文件内容进行全量覆盖。\n\n建议先导出备份。是否继续？")) {
              return;
          }

          // Improved Regex to catch more patterns:
          // Supports: 第1幕, 第一章, Act 1, Scene 1, Chapter 1, markdown headers (### Act 1)
          const actHeaderRegex = /(?:^|\n)\s*(?:#{1,3}\s*)?(?:第\s*[0-90-9一二三四五六七八九十百]+\s*[幕节章场]|Act\s*\d+|Chapter\s*\d+|Scene\s*\d+)\s*[:：]?\s*(.*?)(?:\n|$)/ig;
          
          const newActs: ScriptAct[] = [];
          
          const matches = [...text.matchAll(actHeaderRegex)];

          if (matches.length === 0) {
              // No structure detected, import as one big act
               newActs.push({
                  id: Math.random().toString(36).substr(2, 9),
                  title: "导入的内容",
                  description: text.trim()
               });
          } else {
              // Check for preamble (text before first match)
              if (matches[0].index && matches[0].index > 0) {
                  const preamble = text.substring(0, matches[0].index).trim();
                  if (preamble) {
                      newActs.push({
                          id: Math.random().toString(36).substr(2, 9),
                          title: "前言/背景信息",
                          description: preamble
                      });
                  }
              }

              matches.forEach((m, i) => {
                  const title = m[1].trim() || `第 ${i + 1} 幕`;
                  const startIndex = m.index! + m[0].length;
                  // End index is the start of the next match, or end of string
                  const endIndex = matches[i + 1] ? matches[i + 1].index! : text.length;
                  
                  let description = text.substring(startIndex, endIndex).trim();
                  
                  // Clean up separator lines (--- or ===)
                  description = description.replace(/^-{3,}/gm, '').replace(/^={3,}/gm, '').trim();

                  newActs.push({
                      id: Math.random().toString(36).substr(2, 9),
                      title: title,
                      description: description
                  });
              });
          }
          
          if (newActs.length > 0) {
              onUpdateActs(newActs);
              alert(`已覆盖现有内容，成功导入 ${newActs.length} 个剧情节点！`);
          } else {
              alert("文件内容为空或无法解析。");
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-24">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">剧本结构编辑器</h1>
                <p className="text-gray-500 mt-1">编辑现有情节，或让AI根据上下文继续创作。</p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                {/* Hidden File Input */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportTxt}
                    accept=".txt" 
                    className="hidden" 
                />

                <button
                    onClick={handleExportTxt}
                    className="px-3 py-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
                    title="导出为 TXT"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    导出TXT
                </button>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
                    title="从 TXT 导入"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    导入TXT (覆盖)
                </button>

                <div className="w-px h-8 bg-gray-200 mx-1"></div>

                <button 
                    onClick={onBack}
                    className="px-4 py-2 text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    返回大纲
                </button>
            </div>
       </div>

       {/* Acts List */}
       <div className="space-y-6">
            {plan.acts.map((act, index) => (
                <div key={act.id || index} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden group">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shadow-sm flex-shrink-0">
                                {index + 1}
                            </span>
                            <input 
                                type="text"
                                value={act.title}
                                onChange={(e) => handleActChange(index, 'title', e.target.value)}
                                className="bg-transparent font-bold text-gray-800 text-lg border-b border-transparent focus:border-emerald-500 focus:outline-none w-full md:w-96 px-1"
                                placeholder="节点标题"
                            />
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            {processingIndex === index ? (
                                <span className="text-sm text-emerald-600 font-medium flex items-center gap-2 animate-pulse bg-emerald-50 px-3 py-1 rounded-full">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    AI处理中...
                                </span>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleRefineAct(index)}
                                        disabled={processingIndex !== null || isGenerating}
                                        className="px-3 py-1 text-sm bg-white border border-indigo-200 text-indigo-600 rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center gap-1"
                                        title="AI扩写细化"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        细化
                                    </button>
                                    <button
                                        onClick={() => handleSplitAct(index)}
                                        disabled={processingIndex !== null || isGenerating}
                                        className="px-3 py-1 text-sm bg-white border border-orange-200 text-orange-600 rounded hover:bg-orange-50 hover:border-orange-300 transition-colors flex items-center gap-1"
                                        title="AI拆分为多幕"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        拆分
                                    </button>
                                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                    <button 
                                        onClick={() => handleDeleteAct(index)}
                                        disabled={processingIndex !== null || isGenerating}
                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                        title="删除节点"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="p-6">
                         <textarea
                            value={act.description}
                            onChange={(e) => handleActChange(index, 'description', e.target.value)}
                            placeholder="描述该节点发生的具体剧情..."
                            className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none resize-y transition-shadow"
                         />
                    </div>
                </div>
            ))}
       </div>

       {/* Action Bar */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
           <div className="max-w-5xl mx-auto flex justify-between gap-4">
                <button 
                    onClick={handleAddAct}
                    disabled={processingIndex !== null}
                    className="flex-1 py-3 px-6 bg-white border-2 border-dashed border-gray-300 text-gray-600 font-bold rounded-xl hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    添加空白节点
                </button>
                
                <button 
                    onClick={onGenerateNext}
                    disabled={isGenerating || processingIndex !== null}
                    className={`
                        flex-1 py-3 px-6 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2
                        ${isGenerating || processingIndex !== null ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'}
                    `}
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI正在构思后续...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            AI 继续生成剧情
                        </>
                    )}
                </button>
           </div>
       </div>
    </div>
  );
};

export default StructureEditor;