'use client';

import { useState } from 'react';

interface ModeConfig {
  min: number;
  max: number;
}

const modes: Record<string, ModeConfig> = {
  '30-50': { min: 30, max: 50 },
  '40-55': { min: 40, max: 55 },
  '70-90': { min: 70, max: 90 },
  '130-150': { min: 130, max: 150 },
};

function countChineseAndNumbers(text: string): number {
  const matches = text.match(/[\u4e00-\u9fa50-9]/g);
  return matches ? matches.length : 0;
}

function splitIntoSentences(text: string): string[] {
  const sentenceEndings = /([。！？；])/g;
  const parts = text.split(sentenceEndings);
  const sentences: string[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) {
      const sentence = parts[i] + (parts[i + 1] || '');
      sentences.push(sentence);
    }
  }

  return sentences;
}

function splitText(text: string, currentMode: string): string[] {
  const { min, max } = modes[currentMode];
  const segments: string[] = [];
  
  const cleanText = text.replace(/\s+/g, '').replace(/【|】/g, '');
  
  let position = 0;
  const length = cleanText.length;
  
  while (position < length) {
    let segment = '';
    let charCount = 0;
    
    for (let i = position; i < length; i++) {
      const char = cleanText[i];
      const isChineseOrNumber = /[\u4e00-\u9fa50-9]/.test(char);
      
      if (isChineseOrNumber) {
        if (charCount >= max) {
          break;
        }
        charCount++;
      }
      
      segment += char;
      
      if (isChineseOrNumber && charCount >= min && charCount >= max) {
        break;
      }
    }
    
    if (segment.length > 0) {
      segments.push(segment);
      position += segment.length;
    } else {
      break;
    }
  }
  
  return segments.map(s => s.trim());
}

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [currentMode, setCurrentMode] = useState('40-55');
  const [segments, setSegments] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const inputCount = countChineseAndNumbers(inputText);
  const resultCount = segments.reduce((acc, seg) => acc + countChineseAndNumbers(seg), 0);

  const handleSplit = () => {
    if (!inputText.trim()) {
      alert('请输入需要分段的文本');
      return;
    }
    const result = splitText(inputText, currentMode);
    setSegments(result);
  };

  const handleCopy = async () => {
    if (segments.length === 0) {
      alert('没有可复制的内容');
      return;
    }

    const resultText = segments.map((seg, i) => `【${i + 1}】${seg}`).join('\n\n');

    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    }
  };

  const handleClear = () => {
    setInputText('');
    setSegments([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-cyan-400 mb-2 text-shadow-lg shadow-cyan-400/50">
          ✦ 明亮分段工具 ✦
        </h1>
        <p className="text-center text-cyan-200/80 mb-2">智能识别标点，保持语义完整</p>
        <p className="text-center text-cyan-300/70 text-sm mb-4">微信：zhengnianxin123</p>
        {segments.length > 0 && (
          <div className="bg-green-500/20 border border-green-500/40 rounded-full px-6 py-2 mb-4 text-center">
            <span className="text-green-400 font-medium">✓ 分段完成，共生成 {segments.length} 段</span>
          </div>
        )}

        <div className="bg-slate-800/60 backdrop-blur border border-cyan-500/30 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-cyan-400 text-xl">☰</span>
            <span className="text-cyan-200">选择分段模式</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.keys(modes).map((mode) => (
              <button
                key={mode}
                onClick={() => setCurrentMode(mode)}
                className={`py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                  currentMode === mode
                    ? 'bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-400/30'
                    : 'bg-slate-700/60 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-400/20'
                }`}
              >
                {mode}字
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur border border-cyan-500/30 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-cyan-400 text-xl">☐</span>
            <span className="text-cyan-200">输入文本</span>
            <span className="ml-auto text-cyan-300/70 text-sm">
              {inputCount} 字 (仅统计汉字和数字)
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入需要分段的文本..."
            className="w-full h-44 p-4 bg-slate-700/50 border border-cyan-500/20 rounded-lg text-cyan-50 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 resize-y"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={handleSplit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 font-bold rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:-translate-y-0.5"
          >
            <span>✕</span>
            开始分段
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700/60 text-cyan-200 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/20 transition-all duration-300"
          >
            <span>📋</span>
            {copied ? '已复制!' : '复制结果'}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700/60 text-cyan-200 rounded-lg border border-cyan-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300"
          >
            <span>🗑️</span>
            清空内容
          </button>
        </div>

        <div className="bg-slate-800/60 backdrop-blur border border-cyan-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-cyan-400 text-xl">T</span>
            <span className="text-cyan-200">分段结果</span>
            <span className="ml-2 text-cyan-300/70 text-sm">
              (当前模式: {currentMode}字)
            </span>
            <span className="ml-auto text-cyan-300/70 text-sm">
              {resultCount} 字 (仅统计汉字和数字)
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {segments.length === 0 ? (
              <div className="text-slate-500 text-center py-12">分段结果将显示在这里...</div>
            ) : (
              segments.map((segment, index) => {
                const count = countChineseAndNumbers(segment);
                return (
                  <div
                    key={index}
                    className="bg-cyan-400/5 border-l-4 border-cyan-400 rounded-r-lg p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-7 h-7 bg-cyan-400 text-slate-900 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div className="text-cyan-50 pl-10 leading-relaxed">
                      【{segment}】
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="text-green-400 text-xs bg-green-400/10 border border-green-400/30 rounded-full px-3 py-1">
                        ✓ {count}字 符合要求
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}