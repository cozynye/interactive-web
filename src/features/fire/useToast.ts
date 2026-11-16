import { useCallback, useEffect, useRef, useState } from 'react';

// 토스트는 숨김 → 보임 → (정해진 시간 뒤) 숨김으로만 움직인다.
// 보이는 중에 다시 띄우면 시간을 처음부터 다시 센다. 사라지는 동안에도 글자는 남겨 둔다.
export function useToast() {
  const [toast, setToast] = useState({ message: '', on: false });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, ms = 2000) => {
    clearTimeout(timerRef.current);
    setToast({ message, on: true });
    timerRef.current = setTimeout(
      () => setToast((prev) => ({ ...prev, on: false })),
      ms
    );
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toast, show };
}
