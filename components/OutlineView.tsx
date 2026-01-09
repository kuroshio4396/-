import React from 'react';
import { ScriptPlan } from '../types';

interface OutlineViewProps {
  plan: ScriptPlan | null;
  onClear: () => void;
  onUpdate: (updatedPlan: ScriptPlan) => void;
  onEditStructure: () => void;
}

const OutlineView: React.FC<OutlineViewProps> = ({ plan, onClear, onUpdate, onEditStructure }) => {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-lg font-medium">尚未选择剧本大纲</p>
        <p className="text-sm mt-2">请先在“构思规划”中选择一个满意的方案</p>
      </div>
    );
  }

  const handleTextChange = (field: keyof ScriptPlan, value: string) => {
    onUpdate({ ...plan, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-8 text-white">
          <div className="flex justify-between items-start">
             <div className="flex-grow">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3 backdrop-blur-sm border border-white/10">
                    {plan.tone}
                </span>
                <input 
                    type="text" 
                    value={plan.title}
                    onChange={(e) => handleTextChange('title', e.target.value)}
                    className="block w-full text-3xl font-bold mb-2 bg-transparent border-b border-transparent hover:border-white/30 focus:border-white focus:outline-none transition-colors"
                />
                <input 
                    type="text"
                    value={plan.logline}
                    onChange={(e) => handleTextChange('logline', e.target.value)}
                    className="block w-full text-indigo-100 text-lg italic opacity-90 bg-transparent border-b border-transparent hover:border-white/30 focus:border-white focus:outline-none transition-colors"
                />
             </div>
             <button 
                onClick={onClear}
                className="ml-4 text-xs bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors whitespace-nowrap"
             >
                删除/重置
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
            {/* Synopsis */}
            <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                    <span className="w-1 h-6 bg-indigo-500 mr-3 rounded-full"></span>
                    故事简介 (可编辑)
                </h2>
                <textarea
                    value={plan.synopsis}
                    onChange={(e) => handleTextChange('synopsis', e.target.value)}
                    className="w-full h-40 p-4 text-gray-700 leading-relaxed bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all resize-y"
                />
            </section>
            
             <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                    <span className="w-1 h-6 bg-rose-500 mr-3 rounded-full"></span>
                    核心冲突 (可编辑)
                </h2>
                <textarea
                    value={plan.mainConflict}
                    onChange={(e) => handleTextChange('mainConflict', e.target.value)}
                    className="w-full h-24 p-4 text-gray-700 leading-relaxed bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:bg-white transition-all resize-y"
                />
            </section>

            {/* Acts Structure Preview */}
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="w-1 h-6 bg-emerald-500 mr-3 rounded-full"></span>
                        剧本结构规划
                    </h2>
                    <button 
                        onClick={onEditStructure}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                    >
                        <span>进入结构编辑器</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 opacity-75">
                    <p className="text-sm text-gray-500 mb-4">当前共包含 {plan.acts.length} 个情节节点。点击上方按钮可进行增删改或AI续写。</p>
                    <div className="space-y-3">
                        {plan.acts.slice(0, 3).map((act, idx) => (
                             <div key={idx} className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                </span>
                                <span className="font-medium text-gray-700 truncate">{act.title}</span>
                             </div>
                        ))}
                        {plan.acts.length > 3 && (
                            <div className="pl-9 text-sm text-gray-400">...还有 {plan.acts.length - 3} 个节点</div>
                        )}
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default OutlineView;
