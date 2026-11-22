import { useEffect, useRef } from 'react';

export function useVisibilityRefresh(load, interval = 15000) {
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') latest.current();
    };
    const timer = window.setInterval(tick, interval);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [interval]);
}
