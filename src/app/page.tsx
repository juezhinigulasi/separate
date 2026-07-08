'use client';

import { useState, useCallback, useEffect } from 'react';

interface Mode {
  sec: number;
  min: number;
  max: number;
  label: string;
}

const MODES: Mode[] = [
  { sec: 8, min: 38, max: 48, label: '分段8秒' },
  { sec: 10, min: 48, max: 60, label: '分段10秒' },
  { sec: 12, min: 58, max: 72, label: '分段12秒' },
  { sec: 15, min: 72, max: 90, label: '分段15秒' },
  { sec: 25, min: 120, max: 150, label: '分段25秒' },
];

const W_SHORT = 3;
const W_MIDBREAK = 8;
const W_UNDERFILL = 0.15;

function countCJK(s: string): number {
  const matches = s.match(/[\u4e00-\u9fa5\u3400-\u4dbf0-9]/g);
  return matches ? matches.length : 0;
}

function isCJK(ch: string): boolean {
  return /[\u4e00-\u9fa5\u3400-\u4dbf0-9]/.test(ch);
}

function hardSplit(unit: string, max: number): { t: string; strong: boolean }[] {
  const parts: { t: string; strong: boolean }[] = [];
  let buf = '', c = 0;
  for (const ch of [...unit]) {
    buf += ch;
    if (isCJK(ch)) c++;
    if (c >= max) {
      parts.push({ t: buf, strong: false });
      buf = '';
      c = 0;
    }
  }
  if (buf) parts.push({ t: buf, strong: false });
  return parts;
}

function buildUnits(text: string, max: number): { t: string; strong: boolean }[] {
  const sentences: string[] = [];
  text.split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t) return;
    const matches = t.match(/[^。！？]+[。！？]*/g);
    if (matches) {
      matches.forEach(m => {
        const s = m.trim();
        if (s) sentences.push(s);
      });
    }
  });

  const units: { t: string; strong: boolean }[] = [];
  sentences.forEach(sent => {
    const clauses = (sent.match(/[^，。！？；：]+[，。！？；：]*/g) || [sent])
      .map(c => c.trim()).filter(Boolean);
    
    clauses.forEach((c, idx) => {
      const strongEnd = idx === clauses.length - 1;
      if (countCJK(c) <= max) {
        units.push({ t: c, strong: strongEnd });
      } else {
        const hs = hardSplit(c, max);
        hs[hs.length - 1].strong = strongEnd;
        hs.forEach(h => units.push(h));
      }
    });
  });

  return units;
}

function segment(text: string, min: number, max: number): string[] {
  const units = buildUnits(text, max);
  const N = units.length;
  if (!N) return [];

  const len = units.map(u => countCJK(u.t));
  const dp = new Array(N + 1).fill(Infinity);
  dp[0] = 0;
  const back = new Array(N + 1).fill(-1);

  for (let j = 1; j <= N; j++) {
    let segLen = 0;
    for (let i = j - 1; i >= 0; i--) {
      segLen += len[i];
      if (segLen > max) break;

      const isLast = j === N;
      const endsStrong = units[j - 1].strong;

      let cost = (max - segLen) * W_UNDERFILL;
      if (segLen < min) cost += (min - segLen) * W_SHORT;
      if (!endsStrong && !isLast) cost += W_MIDBREAK;

      if (dp[i] + cost < dp[j]) {
        dp[j] = dp[i] + cost;
        back[j] = i;
      }
    }
  }

  const segs: string[] = [];
  let j = N;
  while (j > 0) {
    const i = back[j];
    if (i < 0) {
      return units.map(u => u.t);
    }
    segs.unshift(units.slice(i, j).map(u => u.t).join(''));
    j = i;
  }
  return segs;
}

function fit(len: number, min: number, max: number) {
  if (len > max) return { cls: 'warn', label: '超出上限', over: true };
  if (len < min) return { cls: '偏短', label: '偏短', over: false };
  return { cls: 'ok', label: '符合要求', over: false };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c] || c));
}

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState(MODES[1]);
  const [minChars, setMinChars] = useState(selectedMode.min);
  const [maxChars, setMaxChars] = useState(selectedMode.max);
  const [segments, setSegments] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setMinChars(selectedMode.min);
    setMaxChars(selectedMode.max);
  }, [selectedMode]);

  const updateHint = useCallback(() => {
    return `每段尽量不超过 ${maxChars} 字，尽量不低于 ${minChars} 字`;
  }, [minChars, maxChars]);

  const handleModeClick = useCallback((mode: Mode) => {
    setSelectedMode(mode);
    setMinChars(mode.min);
    setMaxChars(mode.max);
  }, []);

  const syncRange = useCallback(() => {
    let mn = parseInt(minChars.toString(), 10);
    let mx = parseInt(maxChars.toString(), 10);
    if (isNaN(mn) || mn < 1) mn = 1;
    if (isNaN(mx) || mx < 1) mx = 1;
    if (mn > mx) mn = mx;
    setMinChars(mn);
    setMaxChars(mx);
  }, [minChars, maxChars]);

  const handleMinPlus = useCallback(() => {
    setMinChars(prev => {
      const newMin = prev + 1;
      if (inputText.trim()) {
        const result = segment(inputText.trim(), newMin, maxChars);
        setSegments(result);
      }
      return newMin;
    });
    syncRange();
  }, [syncRange, inputText, maxChars]);

  const handleMinMinus = useCallback(() => {
    setMinChars(prev => {
      const newMin = Math.max(1, prev - 1);
      if (inputText.trim()) {
        const result = segment(inputText.trim(), newMin, maxChars);
        setSegments(result);
      }
      return newMin;
    });
    syncRange();
  }, [syncRange, inputText, maxChars]);

  const handleMaxPlus = useCallback(() => {
    setMaxChars(prev => {
      const newMax = prev + 1;
      if (inputText.trim()) {
        const result = segment(inputText.trim(), minChars, newMax);
        setSegments(result);
      }
      return newMax;
    });
    syncRange();
  }, [syncRange, inputText, minChars]);

  const handleMaxMinus = useCallback(() => {
    setMaxChars(prev => {
      const newMax = Math.max(1, prev - 1);
      if (inputText.trim()) {
        const result = segment(inputText.trim(), minChars, newMax);
        setSegments(result);
      }
      return newMax;
    });
    syncRange();
  }, [syncRange, inputText, minChars]);

  const handleSegment = useCallback(() => {
    const text = inputText.trim();
    if (!text) {
      setToastMessage('请先输入文本');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1600);
      return;
    }
    
    const result = segment(text, minChars, maxChars);
    setSegments(result);
    setToastMessage(`分段完成，共生成 ${result.length} 段`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1600);
  }, [inputText, minChars, maxChars]);

  const handleCopy = useCallback(async () => {
    if (!segments.length) {
      setToastMessage('还没有分段结果');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1600);
      return;
    }

    const text = segments.map((s, i) => `【${i + 1}】${s}`).join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage(`已复制 ${segments.length} 段到剪贴板`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        setToastMessage('已复制到剪贴板');
      } catch {
        setToastMessage('复制失败，请手动复制');
      }
      ta.remove();
    }
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1600);
  }, [segments]);

  const handleClear = useCallback(() => {
    setInputText('');
    setSegments([]);
  }, []);

  const renderResults = () => {
    if (!segments.length) {
      return (
        <div className="empty">
          粘贴文本后点击开始分段，结果会显示在这里。
        </div>
      );
    }

    let total = 0;
    let okCount = 0;

    return (
      <>
        <div className="summary">
          共 <b>{segments.length}</b> 段 &nbsp;·&nbsp;
          符合区间 <b>{okCount}</b> 段 &nbsp;·&nbsp;
          区间 <b>{minChars}-{maxChars}</b> 字 &nbsp;·&nbsp;
          总字数 <b>{total}</b>
        </div>
        <div id="results">
          {segments.map((s, i) => {
            const len = countCJK(s);
            total += len;
            const f = fit(len, minChars, maxChars);
            if (f.cls === 'ok') okCount++;
            const pct = Math.min(100, Math.round(len / maxChars * 100));

            return (
              <div key={i} className="seg" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="seg-num">{i + 1}</div>
                <div className="seg-body">
                  <div className="seg-text" dangerouslySetInnerHTML={{ __html: escapeHtml(s) }}></div>
                  <div className="seg-meta">
                    <span className={`chip ${f.cls}`}>
                      {f.cls === 'ok' ? '✓' : '!'} {len}字 · {f.label}
                    </span>
                    <span className="chip neutral">上限 {maxChars}</span>
                    <span className={`fill ${f.over ? 'over' : ''}`}>
                      <span style={{ width: `${pct}%` }}></span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="page-container">
      <style jsx global>{`
        :root {
          --bg: #0a1120;
          --bg-2: #0d1526;
          --surface: #111c30;
          --surface-2: #16243c;
          --line: rgba(120, 160, 220, 0.14);
          --line-strong: rgba(120, 170, 240, 0.28);
          --primary: #2f8dff;
          --primary-bright: #3f9bff;
          --primary-glow: rgba(47, 141, 255, 0.45);
          --cyan: #41d6ff;
          --ok: #2ecb7a;
          --ok-bg: rgba(46, 203, 122, 0.13);
          --warn: #f0a93c;
          --warn-bg: rgba(240, 169, 60, 0.12);
          --text: #e8f0fb;
          --muted: #8ba0c0;
          --muted-2: #6b82a6;
          --radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Source Han Sans SC", "Noto Sans CJK SC", sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
        }

        body {
          min-height: 100vh;
          color: var(--text);
          background: 
            radial-gradient(1200px 600px at 50% -10%, rgba(47, 141, 255, 0.16), transparent 60%),
            radial-gradient(900px 500px at 90% 10%, rgba(65, 214, 255, 0.08), transparent 55%),
            linear-gradient(180deg, #0a1120 0%, #080e1a 100%);
          background-attachment: fixed;
          -webkit-font-smoothing: antialiased;
          line-height: 1.6;
          padding: 40px 18px 80px;
        }

        .wrap {
          max-width: 820px;
          margin: 0 auto;
        }

        header {
          text-align: center;
          margin-bottom: 26px;
        }

        .title {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 1px;
          background: linear-gradient(90deg, #5eb3ff, #41d6ff 55%, #7cc8ff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .title .spark {
          color: var(--cyan);
          font-size: 22px;
          filter: drop-shadow(0 0 8px var(--cyan));
        }

        .subtitle {
          color: var(--muted);
          font-size: 14px;
          margin-top: 8px;
          letter-spacing: 0.5px;
        }

        .wechat {
          color: var(--cyan);
          font-size: 14px;
          margin-top: 8px;
        }

        .card {
          background: linear-gradient(180deg, var(--surface), var(--bg-2));
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 20px 22px;
          margin-top: 18px;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 20px 40px -30px rgba(0, 0, 0, 0.9);
        }

        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 15px;
          font-weight: 600;
          color: #cfe0f5;
        }

        .card-title .ico {
          color: var(--cyan);
          font-size: 15px;
        }

        .count-tag {
          font-size: 12.5px;
          color: var(--muted);
        }

        .count-tag b {
          color: var(--cyan);
          font-weight: 700;
        }

        .modes {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }

        .mode {
          padding: 14px 6px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          text-align: center;
          background: var(--surface-2);
          border: 1px solid var(--line);
          color: #b9cbe6;
          transition: transform 0.12s ease, border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }

        .mode:hover {
          border-color: var(--line-strong);
          transform: translateY(-1px);
        }

        .mode.active {
          background: linear-gradient(180deg, var(--primary-bright), var(--primary));
          border-color: transparent;
          color: #fff;
          box-shadow: 0 8px 22px -8px var(--primary-glow), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
        }

        .rate-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px dashed var(--line);
          font-size: 13.5px;
          color: var(--muted);
          flex-wrap: wrap;
        }

        .rate-row label {
          color: #cfe0f5;
          font-weight: 500;
        }

        .stepper {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 10px;
          overflow: hidden;
          background: var(--surface-2);
        }

        .stepper button {
          width: 34px;
          height: 34px;
          border: none;
          background: transparent;
          color: var(--cyan);
          font-size: 18px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .stepper button:hover {
          background: rgba(65, 214, 255, 0.12);
        }

        .stepper input {
          width: 56px;
          height: 34px;
          border: none;
          background: transparent;
          color: var(--text);
          text-align: center;
          font-size: 15px;
          font-weight: 600;
          border-left: 1px solid var(--line);
          border-right: 1px solid var(--line);
        }

        .stepper input:focus {
          outline: none;
        }

        .rate-hint {
          font-size: 12.5px;
          color: var(--muted-2);
        }

        textarea {
          width: 100%;
          min-height: 210px;
          resize: vertical;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--text);
          font-size: 15px;
          line-height: 1.85;
          padding: 16px 18px;
          font-family: inherit;
        }

        textarea::placeholder {
          color: #5a708f;
        }

        textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(47, 141, 255, 0.15);
        }

        .actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin: 22px 0 4px;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          border-radius: 11px;
          cursor: pointer;
          font-size: 14.5px;
          font-weight: 600;
          border: 1px solid var(--line);
          background: var(--surface-2);
          color: #cfe0f5;
          transition: transform 0.12s, border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }

        .btn:hover {
          transform: translateY(-1px);
          border-color: var(--line-strong);
        }

        .btn:active {
          transform: translateY(0);
        }

        .btn.primary {
          background: linear-gradient(180deg, var(--primary-bright), var(--primary));
          border-color: transparent;
          color: #fff;
          box-shadow: 0 10px 26px -10px var(--primary-glow);
        }

        .btn.primary:hover {
          box-shadow: 0 12px 30px -8px var(--primary-glow);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .summary {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 16px;
        }

        .summary b {
          color: var(--cyan);
          font-weight: 700;
        }

        .seg {
          display: flex;
          gap: 14px;
          padding: 16px;
          margin-bottom: 12px;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 13px;
          animation: rise 0.35s ease both;
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }

        .seg-num {
          flex: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(180deg, var(--primary-bright), var(--primary));
          box-shadow: 0 6px 14px -6px var(--primary-glow);
        }

        .seg-body {
          flex: 1;
          min-width: 0;
        }

        .seg-text {
          font-size: 15px;
          line-height: 1.8;
          color: #eaf2fd;
          word-break: break-word;
        }

        .seg-meta {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .chip {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .chip.ok {
          color: var(--ok);
          background: var(--ok-bg);
        }

        .chip.warn {
          color: var(--warn);
          background: var(--warn-bg);
        }

        .chip.neutral {
          color: #9fb6d6;
          background: rgba(120, 160, 220, 0.1);
        }

        .fill {
          flex: 1;
          min-width: 80px;
          height: 5px;
          border-radius: 999px;
          background: rgba(120, 160, 220, 0.14);
          overflow: hidden;
        }

        .fill > span {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--primary), var(--cyan));
          transition: width 0.4s;
        }

        .fill.over > span {
          background: linear-gradient(90deg, var(--warn), #ffcf7a);
        }

        .empty {
          text-align: center;
          color: var(--muted-2);
          padding: 26px 10px;
          font-size: 14px;
        }

        .toast {
          position: fixed;
          left: 50%;
          bottom: 34px;
          transform: translateX(-50%) translateY(20px);
          background: var(--surface);
          border: 1px solid var(--line-strong);
          color: var(--text);
          padding: 11px 22px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s, transform 0.25s;
          box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.8);
        }

        .toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        @media (max-width: 560px) {
          body {
            padding: 26px 12px 60px;
          }
          .title {
            font-size: 23px;
          }
          .modes {
            grid-template-columns: repeat(3, 1fr);
          }
          .card {
            padding: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="wrap">
        <header>
          <div className="title">
            <span className="spark">✦</span>
            明亮分段工具
            <span className="spark">✦</span>
          </div>
          <div className="subtitle">智能识别标点，保持语义完整 · 一键分段配音速</div>
          <div className="wechat">微信：zhengnianxin123</div>
        </header>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <span className="ico">☰</span>
              选择分段模式
            </div>
          </div>
          <div className="modes">
            {MODES.map((mode) => (
              <div
                key={mode.sec}
                className={`mode ${selectedMode.sec === mode.sec ? 'active' : ''}`}
                onClick={() => handleModeClick(mode)}
                data-sec={mode.sec}
                data-min={mode.min}
                data-max={mode.max}
              >
                {mode.label}
              </div>
            ))}
          </div>
          <div className="rate-row">
            <label>每段字数</label>
            <div className="stepper">
              <button type="button" onClick={handleMinMinus}>−</button>
              <input
                type="number"
                value={minChars}
                onChange={(e) => setMinChars(parseInt(e.target.value, 10) || 1)}
                min={1}
                max={500}
                step={1}
              />
              <button type="button" onClick={handleMinPlus}>+</button>
            </div>
            <span>最低</span>
            <div className="stepper">
              <button type="button" onClick={handleMaxMinus}>−</button>
              <input
                type="number"
                value={maxChars}
                onChange={(e) => setMaxChars(parseInt(e.target.value, 10) || 1)}
                min={1}
                max={500}
                step={1}
              />
              <button type="button" onClick={handleMaxPlus}>+</button>
            </div>
            <span>最高</span>
            <span className="rate-hint">{updateHint()}</span>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <span className="ico">□</span>
              输入文本
            </div>
            <div className="count-tag">
              <b>{countCJK(inputText)}</b> 字(仅统计汉字和数字)
            </div>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="把你的文案粘贴到这里……"
          />
        </section>

        <div className="actions">
          <button className="btn primary" onClick={handleSegment}>
            ✦ 开始分段
          </button>
          <button className="btn" onClick={handleCopy} disabled={!segments.length}>
            📋 复制结果
          </button>
          <button className="btn" onClick={handleClear}>
            🗑️ 清空内容
          </button>
        </div>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <span className="ico">T</span>
              分段结果
              <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '13px' }}>
                (当前模式: {selectedMode.label} · {minChars}-{maxChars}字)
              </span>
            </div>
            <div className="count-tag">
              <b>{countCJK(inputText)}</b> 字(仅统计汉字和数字)
            </div>
          </div>
          {renderResults()}
        </section>
      </div>

      <div className={`toast ${showToast ? 'show' : ''}`}>{toastMessage}</div>
    </div>
  );
}
