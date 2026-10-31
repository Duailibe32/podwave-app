export interface ScrollToSectionOptions {
  offsetPx?: number;
  updateHash?: boolean;
  moveFocus?: boolean;
  afterFrames?: number;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

function scheduleAfterFrames(frames: number, callback: () => void): void {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function' || frames <= 0) {
    callback();
    return;
  }
  let remaining = frames;
  const step = () => {
    remaining -= 1;
    if (remaining <= 0) {
      callback();
    } else {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

export function scrollToTop(options?: { updateHash?: boolean }): void {
  if (typeof window === 'undefined') return;

  if (options?.updateHash && window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: getScrollBehavior(),
  });
}

export function scrollToSectionById(
  rawSectionId: string,
  options: ScrollToSectionOptions = {}
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const normalizedId = rawSectionId.replace(/^#/, '').trim();
  if (!normalizedId) {
    return false;
  }

  if (normalizedId === 'topo') {
    scrollToTop({ updateHash: options.updateHash ?? false });
    return true;
  }

  const {
    offsetPx = 16,
    updateHash = true,
    moveFocus = true,
    afterFrames = 2,
  } = options;

  const performScroll = (): boolean => {
    const target =
      document.getElementById(normalizedId) ||
      (normalizedId === 'modelos' ? document.getElementById('catalogo') : null) ||
      (normalizedId === 'catalogo' ? document.getElementById('modelos') : null);

    if (!target) {
      return false;
    }

    const stickyHeader = document.querySelector<HTMLElement>('[data-sticky-header="true"]');
    const stickyHeaderHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;

    const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const rect = target.getBoundingClientRect();
    const rawTargetTop = currentScrollY + rect.top - stickyHeaderHeight - offsetPx;
    const maxScrollTop = Math.max(
      0,
      Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      ) - window.innerHeight
    );
    const targetTop = Math.max(0, Math.min(rawTargetTop, maxScrollTop));

    if (updateHash) {
      const targetHash = `#${target.id || normalizedId}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}${targetHash}`
        );
      }
    }

    window.scrollTo({
      top: targetTop,
      left: 0,
      behavior: getScrollBehavior(),
    });

    if (moveFocus) {
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      try {
        target.focus({ preventScroll: true });
      } catch {
        // Fallback for older browsers that don't support FocusOptions
      }
    }

    return true;
  };

  scheduleAfterFrames(afterFrames, () => {
    performScroll();
  });

  return true;
}
