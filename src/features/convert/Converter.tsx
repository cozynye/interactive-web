'use client';

import { ChangeEvent, DragEvent, useEffect, useEffectEvent, useRef, useState } from 'react';

import styles from './Converter.module.css';
import { Art, paint, toArt } from './render';
import { makeSample } from './sample';
import { rowsFor, toText } from './shape';

type Source = ImageBitmap | HTMLCanvasElement;

const COLS = { min: 40, max: 240, step: 4, start: 120 };
const SHARP = { min: 1, max: 4, step: 0.25, start: 2 };

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// 사진을 받아 글자 그림으로 바꾸고 글자나 PNG로 내보내는 화면. 사진은 브라우저 밖으로 나가지 않는다.
function Converter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artRef = useRef<Art | null>(null);
  const noticeTimer = useRef(0);
  const [source, setSource] = useState<Source | null>(null);
  const [cols, setCols] = useState(COLS.start);
  const [sharp, setSharp] = useState(SHARP.start);
  const [color, setColor] = useState(true);
  const [light, setLight] = useState(false);
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState('');

  const say = (text: string) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2400);
  };

  const load = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      setSource(await createImageBitmap(file));
    } catch {
      say('이 파일은 그림으로 열 수 없다.');
    }
  };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!source || !cv) return;
    const art = toArt(source, source.width, source.height, cols, sharp, light);
    artRef.current = art;
    if (art) paint(cv, art, { color, light });
  }, [source, cols, sharp, color, light]);

  // 바꿔 낀 사진은 메모리에서 내려놓는다
  useEffect(
    () => () => {
      if (source instanceof ImageBitmap) source.close();
    },
    [source]
  );

  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) load(file);
  });
  useEffect(() => {
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
      clearTimeout(noticeTimer.current);
    };
  }, []);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    load(e.target.files?.[0]);
    // 같은 파일을 다시 골라도 change가 오게 비운다
    e.target.value = '';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    load(e.dataTransfer.files[0]);
  };

  const copyText = async () => {
    const art = artRef.current;
    if (!art) return;
    try {
      await navigator.clipboard.writeText(toText(art.ch, art.cols));
      say('글자를 복사했다.');
    } catch {
      say('복사하지 못했다. 브라우저가 클립보드 쓰기를 막았다.');
    }
  };
  const saveText = () => {
    const art = artRef.current;
    if (art) save(new Blob([toText(art.ch, art.cols)], { type: 'text/plain' }), 'ascii.txt');
  };
  const savePng = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob) save(blob, 'ascii.png');
    });
  };

  const rows = source ? rowsFor(source.width, source.height, cols) : 0;

  return (
    <main className={styles.main} data-state={source ? 'ready' : 'empty'}>
      <h1 className={styles.headline}>사진을 글자로</h1>
      <p className={styles.lede}>
        사진을 올리면 글자로 다시 그린다. 칸마다 밝기뿐 아니라 모양이 닮은 글자를 골라서 윤곽이 선으로 남는다.
      </p>

      <div
        className={`${styles.panel}${light ? ` ${styles.light}` : ''}${over ? ` ${styles.over}` : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <canvas ref={canvasRef} className={styles.canvas} hidden={!source} role="img" aria-label="글자로 바꾼 그림" />
        {!source && (
          <div className={styles.empty}>
            <p>사진을 여기에 끌어다 놓거나 붙여 넣는다.</p>
            <div className={styles.row}>
              <label className={styles.pill}>
                사진 고르기
                <input type="file" accept="image/*" className={styles.file} onChange={onPick} />
              </label>
              <button type="button" className={styles.ghost} onClick={() => setSource(makeSample())}>
                예시 그림으로 해 보기
              </button>
            </div>
          </div>
        )}
      </div>

      {source && (
        <>
          <div className={styles.controls}>
            <label className={styles.field}>
              <span>
                가로 칸 수 <output>{cols} × {rows}</output>
              </span>
              <input
                type="range"
                min={COLS.min}
                max={COLS.max}
                step={COLS.step}
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>
                윤곽 선명도 <output>{sharp.toFixed(2)}</output>
              </span>
              <input
                type="range"
                min={SHARP.min}
                max={SHARP.max}
                step={SHARP.step}
                value={sharp}
                onChange={(e) => setSharp(Number(e.target.value))}
              />
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={color} onChange={(e) => setColor(e.target.checked)} />
              원본 색 입히기
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={light} onChange={(e) => setLight(e.target.checked)} />
              밝은 바탕
            </label>
          </div>

          <div className={styles.row}>
            <button type="button" className={styles.pill} onClick={copyText}>
              글자 복사
            </button>
            <button type="button" className={styles.ghost} onClick={savePng}>
              PNG 저장
            </button>
            <button type="button" className={styles.ghost} onClick={saveText}>
              TXT 저장
            </button>
            <label className={styles.ghost}>
              다른 사진 고르기
              <input type="file" accept="image/*" className={styles.file} onChange={onPick} />
            </label>
          </div>
        </>
      )}

      <p className={styles.notice} role="status">
        {notice}
      </p>
      <p className={styles.foot}>
        사진은 이 브라우저 안에서만 처리하고 서버로 보내지 않는다. 복사한 글자는 고정폭 글꼴로 붙여야 줄이 맞는다.
      </p>
    </main>
  );
}

export default Converter;
