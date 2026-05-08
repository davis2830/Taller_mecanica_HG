import { useEffect, useRef, useState } from 'react';

export function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

export function useCounter(end, duration = 2000, start = 0, visible = false) {
  const [val, setVal] = useState(start);
  useEffect(() => {
    if (!visible) return;
    let raf;
    const startTime = performance.now();
    const step = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      setVal(Math.floor(start + (end - start) * p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, end, duration, start]);
  return val;
}
