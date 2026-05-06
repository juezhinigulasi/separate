'use client';

import { useState, useCallback } from 'react';

interface SegmentResult {
  text: string;
  charCount: number;
}

const SEGMENT_MODES = [
  { label: '30-50字', min: 30, max: 50 },
  { label: '40-60字', min: 40, max: 60 },
  { label: '70-90字', min: 70, max: 90 },
  { label: '130-150字', min: 130, max: 150 },
];

function countChineseChars(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if ((charCode >= 0x4E00 && charCode <= 0x9FFF) || 
        (charCode >= 0x0030 && charCode <= 0x0039)) {
      count++;
    }
  }
  return count;
}

function segmentText(text: string, minLen: number, maxLen: number): SegmentResult[] {
  const results: SegmentResult[] = [];
  const punctuation = /[。！？；，、]/g;
  let start = 0;
  
  text = text.trim();
  
  while (start < text.length) {
    let end = start + maxLen;
    if (end >= text.length) {
      const lastPart = text.substring(start).trim();
      if (lastPart) {
        results.push({ text: lastPart, charCount: countChineseChars(lastPart) });
      }
      break;
    }
    
    let foundPunctuation = false;
    let bestSplit = end;
    
    for (let i = end; i >= start + minLen; i--) {
      if (punctuation.test(text[i])) {
        bestSplit = i + 1;
        foundPunctuation = true;
        break;
      }
    }
    
    if (!foundPunctuation) {
      bestSplit = end;
    }
    
    const segment = text.substring(start, bestSplit).trim();
    if (segment) {
      results.push({ text: segment, charCount: countChineseChars(segment) });
    }
    start = bestSplit;
  }
  
  return results;
}

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState(SEGMENT_MODES[1]);
  const [results, setResults] = useState<SegmentResult[]>([]);
  const [showComplete, setShowComplete] = useState(false);

  const handleSegment = useCallback(() => {
    if (!inputText.trim()) return;
    
    const result = segmentText(inputText, selectedMode.min, selectedMode.max);
    setResults(result);
    setShowComplete(true);
    
    setTimeout(() => setShowComplete(false), 3000);
  }, [inputText, selectedMode]);

  const handleCopy = useCallback(async () => {
    const text = results.map(r => `【${r.text}】`).join('\n');
    await navigator.clipboard.writeText(text);
    alert('复制成功！');
  }, [results]);

  const handleClear = useCallback(() => {
    setInputText('');
    setResults([]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2 flex items-center justify-center gap-3">
            <span className="text-2xl">✦</span>
            明亮分段工具
            <span className="text-2xl">✦</span>
          </h1>
          <p className="text-gray-400">智能识别标点，保持语义完整</p>
          <p className="text-cyan-300 mt-2">微信：zhengnianxin123</p>
        </div>

        {showComplete && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-6 py-3 rounded-lg text-center mb-6 flex items-center justify-center gap-2">
            <span>✓</span>
            <span>分段完成，共生成 {results.length} 段</span>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-cyan-500/30 flex items-center justify-center">
              <span className="text-cyan-400 text-sm">☰</span>
            </div>
            <h2 className="text-cyan-400 font-semibold">选择分段模式</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {SEGMENT_MODES.map((mode) => (
              <button
                key={mode.label}
                onClick={() => setSelectedMode(mode)}
                className={`py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                  selectedMode.label === mode.label
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-cyan-500/30 flex items-center justify-center">
                <span className="text-cyan-400 text-sm">□</span>
              </div>
              <h2 className="text-cyan-400 font-semibold">输入文本</h2>
            </div>
            <span className="text-gray-400 text-sm">{countChineseChars(inputText)} 字 (仅统计汉字和数字)</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入需要分段的文案..."
            className="w-full h-48 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={handleSegment}
            className="bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 shadow-lg shadow-cyan-500/30 flex items-center gap-2"
          >
            <span>✕</span>
            开始分段
          </button>
          <button
            onClick={handleCopy}
            disabled={results.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center gap-2"
          >
            <span>📋</span>
            复制结果
          </button>
          <button
            onClick={handleClear}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center gap-2"
          >
            <span>🗑️</span>
            清空内容
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-cyan-500/30 flex items-center justify-center">
                  <span className="text-cyan-400 text-sm">T</span>
                </div>
                <h2 className="text-cyan-400 font-semibold">分段结果 (当前模式: {selectedMode.label})</h2>
              </div>
              <span className="text-gray-400 text-sm">{countChineseChars(inputText)} 字 (仅统计汉字和数字)</span>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {results.map((result, index) => {
                const isInRange = result.charCount >= selectedMode.min && result.charCount <= selectedMode.max;
                return (
                  <div key={index} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white mb-2">【{result.text}】</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          isInRange ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          <span>◎</span>
                          <span>{result.charCount}字</span>
                          <span>{isInRange ? '✓ 符合要求' : '超出范围'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
