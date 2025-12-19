import React, { useState } from 'react';
import { optimizePrompt, getPromptSuggestions, ensureApiKey } from '../services/geminiService';
import { AppMode } from '../types';

interface PromptEnhancerProps {
  value: string;
  onChange: (value: string) => void;
  mode: AppMode;
  className?: string;
}

export const PromptEnhancer: React.FC<PromptEnhancerProps> = ({ value, onChange, mode, className = '' }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!value.trim()) return;
    setIsOptimizing(true);
    setError(null);
    try {
      await ensureApiKey();
      // Pass the current mode to the optimize function
      const optimized = await optimizePrompt(value, mode);
      onChange(optimized);
    } catch (e) {
      setError("优化失败，请重试");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    setError(null);
    try {
      await ensureApiKey();
      // Pass the current mode to the suggestion function
      const newSuggestions = await getPromptSuggestions(mode);
      setSuggestions(newSuggestions);
    } catch (e) {
      setError("无法获取建议");
    } finally {
      setIsSuggesting(false);
    }
  };

  const addSuggestion = (suggestion: string) => {
    const newValue = value ? `${value}, ${suggestion}` : suggestion;
    onChange(newValue);
    setSuggestions([]); // clear after pick
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs text-zinc-500 mb-1">补充提示词 (可选)</label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === AppMode.MODEL_SHOT ? "例如：模特在海边回头微笑，海风吹起头发..." : "例如：背景改为极简水泥灰，增加柔和阴影..."}
          className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-white focus:outline-none transition-colors min-h-[80px] resize-y"
        />
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={handleOptimize}
          disabled={isOptimizing || !value.trim()}
          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-indigo-900/30 text-indigo-200 border border-indigo-800 rounded-full hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
        >
          {isOptimizing ? <span className="animate-spin">⟳</span> : '✨'} AI 优化
        </button>
        <button
          onClick={handleSuggest}
          disabled={isSuggesting}
          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-emerald-900/30 text-emerald-200 border border-emerald-800 rounded-full hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
        >
          {isSuggesting ? <span className="animate-spin">⟳</span> : '💡'} 推荐提示词
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 animate-fade-in">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => addSuggestion(s)}
              className="text-xs text-zinc-300 bg-zinc-800 px-3 py-1 rounded-full hover:bg-zinc-700 border border-zinc-700 transition-colors text-left"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};