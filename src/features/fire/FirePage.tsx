'use client';

import React, { useEffect, useRef, useState } from 'react';

import './FirePage.css';
import {
  KNIT_FIRE_AMOUNT_MAX,
  KNIT_FIRE_TEXT_MAX,
  loadKnitFireSettings,
  SKIES,
  YARNS,
} from './knitFire.constant';
import { createKnitFire, KnitFire } from './knitFireEngine';

type PanelType = 'yarn' | 'sky';

function swatchBg(cols: string[] | null | undefined) {
  if (!cols)
    return 'conic-gradient(#e0453a,#e9b949,#3fae6c,#4a7fe0,#9a6ae0,#f07aa8,#e0453a)';
  if (cols.length === 1) return cols[0];
  const stops = cols
    .map(
      (c, i) =>
        `${c} ${(i / cols.length) * 360}deg ${((i + 1) / cols.length) * 360}deg`
    )
    .join(',');
  return `conic-gradient(${stops})`;
}

// 포커스가 글자 입력칸에서 빠지지 않게 버튼의 기본 동작을 막는다
const keepFocus = (e: React.PointerEvent) => e.preventDefault();

function FirePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef<KnitFire | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [settings, setSettings] = useState(loadKnitFireSettings);
  const [panel, setPanel] = useState<PanelType | null>(null);
  const [ground, setGround] = useState({ top: 0, hasText: false });
  const [isHintGone, setIsHintGone] = useState(false);
  const [toast, setToast] = useState({ message: '', on: false });

  useEffect(() => {
    if (!canvasRef.current || !textareaRef.current) return undefined;
    const engine = createKnitFire({
      canvas: canvasRef.current,
      textarea: textareaRef.current,
      settings: loadKnitFireSettings(),
      // 주소의 ?text= 글자를 열자마자 쏜다
      initialText:
        new URLSearchParams(window.location.search).get('text') || undefined,
      onGround: (top, hasText) => setGround({ top, hasText }),
      onCanvasDown: () => setPanel(null),
      onHideHint: () => setIsHintGone(true),
    });
    engineRef.current = engine;
    // 들어오자마자 쏘는 법을 잠깐 알려준다
    setToast({
      message: '하늘을 클릭하거나 터치하면 폭죽이 올라와요',
      on: true,
    });
    toastTimerRef.current = setTimeout(
      () => setToast((prev) => ({ ...prev, on: false })),
      3500
    );
    return () => {
      engine.destroy();
      engineRef.current = null;
      clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToast({ message, on: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast((prev) => ({ ...prev, on: false })),
      2000
    );
  };

  const handleAmount = (amount: number) => {
    engineRef.current?.setAmount(amount);
    setSettings((prev) => ({ ...prev, amount }));
    if (!amount) showToast('자동 불꽃 꺼짐 — 하늘을 톡 눌러 쏘세요');
  };

  const handleCopyLink = async () => {
    const text = textareaRef.current?.value.trim();
    if (!text) return;
    const url = `${window.location.origin}${
      window.location.pathname
    }?text=${encodeURIComponent(text)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('링크를 복사했어요 — 열면 이 글자가 터져요');
    } catch (e) {
      showToast('링크를 복사하지 못했어요');
    }
  };

  const handleSound = (sound: boolean) => {
    engineRef.current?.setSound(sound);
    setSettings((prev) => ({ ...prev, sound }));
  };

  const yarn = YARNS.find((y) => y.id === settings.yarn);

  return (
    <div className="fire-page">
      <canvas className="fire-canvas" ref={canvasRef} />
      <textarea
        className="text-input"
        ref={textareaRef}
        maxLength={KNIT_FIRE_TEXT_MAX}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="불꽃으로 쏠 글자"
      />
      <div className="bar">
        <div className="grp">
          {(['yarn', 'sky'] as PanelType[]).map((type) => (
            <button
              key={type}
              className={`btn${panel === type ? ' sel' : ''}`}
              onPointerDown={keepFocus}
              onClick={() => setPanel(panel === type ? null : type)}
            >
              {type === 'yarn' && (
                <span
                  className="sw"
                  style={{ background: swatchBg(yarn?.c) }}
                />
              )}
              {type === 'yarn' ? '실' : '하늘'}
            </button>
          ))}
          <button
            className="btn"
            onPointerDown={keepFocus}
            onClick={() => {
              engineRef.current?.audio();
              engineRef.current?.fireMass();
            }}
          >
            대량<span className="wide-only">폭죽</span>
          </button>
        </div>
        <div className="grp">
          <div className="amount">
            불꽃 양
            <input
              type="range"
              min={0}
              max={KNIT_FIRE_AMOUNT_MAX}
              step={1}
              value={settings.amount}
              aria-label="불꽃 양"
              onChange={(e) => handleAmount(Number(e.target.value))}
              // 슬라이더에 포커스가 남으면 글자 키가 입력칸으로 안 넘어간다
              onPointerUp={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>
      </div>
      {panel === 'yarn' && (
        <div className="panel">
          <h4>불꽃 실</h4>
          <div className="grid">
            {YARNS.map((y) => (
              <div
                key={y.id}
                className={`opt${settings.yarn === y.id ? ' sel' : ''}`}
                onClick={() => {
                  engineRef.current?.setYarn(y.id);
                  setSettings((prev) => ({ ...prev, yarn: y.id }));
                }}
              >
                <span className="sw" style={{ background: swatchBg(y.c) }} />
                {y.n}
              </div>
            ))}
          </div>
          <div className="note">
            톡 쏘는 불꽃과 글자 불꽃이 이 실로 떠져요. 단계 염색 실은 갈래마다
            색이 바뀌어요.
          </div>
        </div>
      )}
      {panel === 'sky' && (
        <div className="panel">
          <h4>밤하늘 천</h4>
          <div className="grid">
            {SKIES.map((s) => (
              <div
                key={s.id}
                className={`opt${settings.sky === s.id ? ' sel' : ''}`}
                onClick={() => {
                  engineRef.current?.setSky(s.id);
                  setSettings((prev) => ({ ...prev, sky: s.id }));
                }}
              >
                <span
                  className="sw"
                  style={{
                    background: `linear-gradient(${s.c} 62%,${s.g} 62%)`,
                  }}
                />
                {s.n}
              </div>
            ))}
          </div>
          <div className="row">
            <span>소리</span>
            <div className="seg">
              <button
                className={`btn${settings.sound ? ' sel' : ''}`}
                onClick={() => handleSound(true)}
              >
                켜기
              </button>
              <button
                className={`btn${settings.sound ? '' : ' sel'}`}
                onClick={() => handleSound(false)}
              >
                끄기
              </button>
            </div>
          </div>
          <div className="row">
            <span>실밥</span>
            <div className="seg">
              <button
                className="btn"
                onClick={() => {
                  engineRef.current?.sweep();
                  showToast('실밥을 쓸었어요');
                }}
              >
                땅에 쌓인 실밥 쓸기
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`actions${ground.hasText ? ' on' : ''}`}
        style={{ top: ground.top - 56 }}
      >
        <button
          className="btn"
          onPointerDown={keepFocus}
          onClick={handleCopyLink}
        >
          링크 복사
        </button>
        <button
          className="fire"
          onPointerDown={(e) => {
            e.preventDefault();
            engineRef.current?.audio();
            engineRef.current?.fireText();
          }}
        >
          쏘아 올리기 <span className="arrow">↑</span>
        </button>
      </div>
      <div
        className={`hint${isHintGone ? ' gone' : ''}`}
        style={{ top: ground.top - 62 }}
      >
        하늘을 톡 → 불꽃
        <br />
        땅을 톡 → 글자 쓰고 엔터 → 글자 불꽃
      </div>
      <div className={`toast${toast.on ? ' on' : ''}`}>{toast.message}</div>
    </div>
  );
}

export default FirePage;
