import { useEffect, useState } from 'react';
import type { FlashSale } from '../types/catalog';

/** Reprice only at time boundaries/resume; the one-second countdown stays in its banner. */
export function useFlashSaleBoundary(sale?: FlashSale) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!sale?.enabled) return;
    const refresh = () => setRevision(value => value + 1);
    const now = Date.now();
    const next = [Date.parse(sale.startsAt), Date.parse(sale.endsAt)]
      .filter(time => Number.isFinite(time) && time > now).sort((a, b) => a - b)[0];
    const timer = next ? setTimeout(refresh, Math.min(next - now + 10, 2147483647)) : undefined;
    const resume = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', refresh);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', refresh);
    };
  }, [sale?.enabled, sale?.startsAt, sale?.endsAt, revision]);
}
