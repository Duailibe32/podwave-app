import { useEffect, useRef, useState } from 'react';

export function useCartFeedback() {
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const confirm = (source: HTMLElement, emoji: string) => {
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1000);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !source.animate) return;

    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'))
      .find(element => element.getClientRects().length > 0);
    if (!target) return;
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const x = from.left + from.width / 2 - 17;
    const y = from.top + from.height / 2 - 17;
    const dx = to.left + to.width / 2 - 17 - x;
    const dy = to.top + to.height / 2 - 17 - y;
    const spark = document.createElement('span');
    spark.className = 'cart-flight';
    spark.textContent = emoji || '✓';
    spark.setAttribute('aria-hidden', 'true');
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    document.body.append(spark);
    const flight = spark.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.46 + 'px, ' + (dy * 0.38 - 32) + 'px) scale(1.2)', opacity: 1, offset: 0.45 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(.35)', opacity: 0 },
    ], { duration: 420, easing: 'ease-in-out' });
    flight.finished.then(() => {
      spark.remove();
      const badge = target.querySelector('.storefront-badge') || target;
      badge.animate([
        { scale: 1, boxShadow: '0 0 0 #00DFFF00' },
        { scale: 1.25, boxShadow: '0 0 12px #00DFFFaa' },
        { scale: 1, boxShadow: '0 0 0 #00DFFF00' },
      ], { duration: 300 });
    }, () => spark.remove());
  };

  return { added, confirm };
}
