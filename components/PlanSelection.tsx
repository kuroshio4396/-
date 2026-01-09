import React from 'react';
import { ScriptPlan } from '../types';

interface PlanSelectionProps {
  plans: ScriptPlan[];
  onSelect: (plan: ScriptPlan) => void;
  onRedo: () => void;
  isGenerating: boolean;
  onBack: () => void;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ plans, onSelect, onRedo, isGenerating, onBack }) => {
  if (plans.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">选择一个剧本规划</h2>
            <p className="text-gray-500 mt-1">AI为您生成了以下几个发展方向。选择一个最吸引你的加入大纲。</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
             <button
                onClick={onBack}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                返回修改灵感
            </button>
            <button
                onClick={onRedo}
                disabled={isGenerating}
                className={`
                px-5 py-2 rounded-lg font-medium text-white shadow-sm transition-all
                ${isGenerating ? 'bg-gray-400' : 'bg-rose-500 hover:bg-rose-600'}
                `}
            >
                {isGenerating ? '正在重构...' : '都不满意？重做'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-3">
                 <h3 className="text-xl font-bold text-gray-900 leading-tight">{plan.title}</h3>
                 <span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-100 whitespace-nowrap ml-2">
                    {plan.tone}
                 </span>
              </div>
              
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">一句话梗概</h4>
                <p className="text-sm text-gray-700 italic border-l-2 border-indigo-300 pl-3">{plan.logline}</p>
              </div>

              <div className="mb-4">
                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">主要冲突</h4>
                 <p className="text-sm text-gray-600">{plan.mainConflict}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">简介</h4>
                <p className="text-sm text-gray-600 line-clamp-4">{plan.synopsis}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => onSelect(plan)}
                className="w-full py-2.5 bg-white border border-indigo-200 text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
              >
                <span>加入剧本大纲</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanSelection;
