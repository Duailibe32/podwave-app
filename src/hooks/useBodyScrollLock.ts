import { useEffect } from 'react';

let locks = 0;
let previousOverflow = '';

/** Multiple dialogs (including the install guide) must not unlock each other. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    if (locks === 0) previousOverflow = document.body.style.overflow;
    locks += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
