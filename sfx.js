// ============ sfx.js 交互音效引擎（Web Audio 合成，零音频文件） ============
// 用法：import { sfx } from './sfx.js';  然后 sfx.pop() / sfx.chime() …
// 总开关持久化在 localStorage（romantic-sfx），可在音乐播放器面板中切换。

const SFX_KEY = 'romantic-sfx';
let ctx = null;

function audioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 单音：振荡器 + 音量包络（快起缓落），可带滑音
function tone({ freq, to = null, dur = .2, type = 'sine', vol = .5, delay = 0 }) {
  const c = audioCtx();
  if (!c || !sfx.enabled) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + .05);
}

// 噪声：白噪声 + 带通滤波（模拟纸张沙沙声）
function noise({ dur = .15, vol = .25, delay = 0, freq = 2600, q = .8 }) {
  const c = audioCtx();
  if (!c || !sfx.enabled) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  get enabled() { try { return localStorage.getItem(SFX_KEY) !== 'off'; } catch { return true; } },
  set enabled(v) { try { localStorage.setItem(SFX_KEY, v ? 'on' : 'off'); } catch { /* 忽略 */ } },
  toggle() { this.enabled = !this.enabled; return this.enabled; },

  /** 点击爱心彩蛋：轻柔"啵" */
  pop() { tone({ freq: 740, to: 988, dur: .1, vol: .26 }); },

  /** 勾选愿望完成：清脆风铃上扬音阶 */
  chime() { [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: .32, vol: .15, delay: i * .07 })); },

  /** 写下新愿望：软"叮" */
  ding() { tone({ freq: 1318.5, dur: .22, vol: .18 }); tone({ freq: 1976, dur: .18, vol: .07, delay: .04 }); },

  /** 添加愿望 / 翻页：纸张轻响 */
  page() { noise({ dur: .16, vol: .16, freq: 3200 }); noise({ dur: .12, vol: .09, freq: 1800, delay: .1 }); },

  /** 收到对方新愿望：门铃叮咚 */
  doorbell() { tone({ freq: 830, dur: .3, vol: .16, type: 'triangle' }); tone({ freq: 659, dur: .42, vol: .16, type: 'triangle', delay: .26 }); },

  /** 开场柔光琶音（约 2 秒，C 大调 add9 上行） */
  arpeggio() {
    [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((f, i) => {
      tone({ freq: f, dur: .9, vol: .12, delay: i * .22 });
      tone({ freq: f * 2, dur: .7, vol: .045, delay: i * .22, type: 'triangle' });
    });
  },
};

/**
 * 开场琶音彩蛋：仅首次访问播放（localStorage 标记站点级）。
 * 浏览器自动播放策略下，会在用户第一次点击页面时轻声响起。
 */
export function playArpeggioOnce() {
  const KEY = 'romantic-visited';
  const fire = () => {
    try {
      if (localStorage.getItem(KEY)) return;
      localStorage.setItem(KEY, '1');
    } catch { return; }
    sfx.arpeggio();
  };
  window.addEventListener('pointerdown', fire, { once: true, capture: true });
}
