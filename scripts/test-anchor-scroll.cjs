const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

const root = path.resolve(__dirname, '..');

function readSource(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function loadAnchorNavigationModule(customWindow, customDocument) {
  const sourcePath = path.join(root, 'src/utils/anchorNavigation.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = transformSync(source, {
    loader: 'ts',
    format: 'cjs',
    target: 'es2022',
  }).code;

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    window: customWindow,
    document: customDocument,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });
  return module.exports;
}

function testStaticCodeContracts() {
  const indexCss = readSource('src/index.css');
  const headerTsx = readSource('src/components/Header.tsx');
  const brandScrollerTsx = readSource('src/components/BrandScroller.tsx');
  const catalogSectionTsx = readSource('src/components/CatalogSection.tsx');
  const appTsx = readSource('src/App.tsx');

  // 1. No dual overflow-x: hidden on html + body
  const htmlBlockMatch = indexCss.match(/html\s*\{[\s\S]*?\}/);
  const bodyBlockMatch = indexCss.match(/body\s*\{[\s\S]*?\}/);
  assert.ok(htmlBlockMatch && htmlBlockMatch[0].includes('overflow-x: clip'), 'html should use overflow-x: clip');
  assert.ok(bodyBlockMatch && bodyBlockMatch[0].includes('overflow-x: clip'), 'body should use overflow-x: clip');

  // 2. No href="#" anywhere in Header, BrandScroller, HeroBanner, TopCarouselBar, or Footer
  for (const rel of [
    'src/components/Header.tsx',
    'src/components/BrandScroller.tsx',
    'src/components/HeroBanner.tsx',
    'src/components/TopCarouselBar.tsx',
    'src/components/Footer.tsx',
  ]) {
    const content = readSource(rel);
    assert.ok(!/href\s*=\s*["']#["']/.test(content), `${rel} must not contain href="#"`);
  }

  // 3. Semantic anchor links with href="#marcas" on both desktop and mobile nav in Header.tsx
  const marcasHrefCount = (headerTsx.match(/href="#marcas"/g) || []).length;
  assert.ok(marcasHrefCount >= 2, 'Header.tsx must provide href="#marcas" on both desktop and mobile navigation');
  assert.ok(
    headerTsx.includes('id="mobile-navigation-drawer"') && headerTsx.includes('absolute top-full left-0 right-0'),
    'Mobile drawer in Header.tsx must be positioned as an absolute overlay so closing it does not collapse document height'
  );

  // 4. CatalogSection does not use mode="popLayout" or layout projection on product-grid
  assert.ok(
    !catalogSectionTsx.includes('mode="popLayout"'),
    'CatalogSection.tsx must not use mode="popLayout" which fights scrollIntoView on first brand filter click'
  );

  // 5. All target sections have tabIndex={-1} and scroll-mt-20 for keyboard accessibility & offset
  assert.ok(brandScrollerTsx.includes('id="marcas" tabIndex={-1}') && brandScrollerTsx.includes('scroll-mt-20'));
  assert.ok(catalogSectionTsx.includes('id="catalogo" tabIndex={-1}') && catalogSectionTsx.includes('scroll-mt-20'));
  assert.ok(appTsx.includes('id="modelos" tabIndex={-1}') && appTsx.includes('scroll-mt-20'));
}

function createSimulatedEnvironment({ reducedMotion = false, isMobile = false } = {}) {
  const scrollCalls = [];
  const focusCalls = [];
  const historyCalls = [];
  const rafQueue = [];

  const elementsById = {
    marcas: {
      id: 'marcas',
      rectTop: isMobile ? 640 : 720,
      attributes: new Map([['tabindex', '-1']]),
      hasAttribute(name) {
        return this.attributes.has(name);
      },
      setAttribute(name, val) {
        this.attributes.set(name, val);
      },
      getBoundingClientRect() {
        return { top: this.rectTop - mockWindow.scrollY, height: isMobile ? 480 : 320 };
      },
      focus(opts) {
        focusCalls.push({ id: this.id, opts });
      },
    },
    catalogo: {
      id: 'catalogo',
      rectTop: isMobile ? 1160 : 1080,
      attributes: new Map([['tabindex', '-1']]),
      hasAttribute(name) {
        return this.attributes.has(name);
      },
      setAttribute(name, val) {
        this.attributes.set(name, val);
      },
      getBoundingClientRect() {
        return { top: this.rectTop - mockWindow.scrollY, height: 1400 };
      },
      focus(opts) {
        focusCalls.push({ id: this.id, opts });
      },
    },
  };

  const mockDocument = {
    documentElement: {
      scrollTop: 0,
      scrollHeight: 3600,
    },
    body: {
      scrollHeight: 3600,
    },
    getElementById(id) {
      return elementsById[id] || null;
    },
    querySelector() {
      return null;
    },
  };

  const mockWindow = {
    scrollY: 0,
    pageYOffset: 0,
    innerHeight: isMobile ? 844 : 900,
    innerWidth: isMobile ? 390 : 1440,
    location: {
      pathname: '/',
      search: '',
      hash: '',
    },
    history: {
      replaceState(_state, _title, url) {
        historyCalls.push(url);
        const hashIdx = String(url).indexOf('#');
        mockWindow.location.hash = hashIdx >= 0 ? String(url).slice(hashIdx) : '';
      },
    },
    matchMedia(query) {
      return {
        matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      };
    },
    requestAnimationFrame(cb) {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    scrollTo(opts) {
      scrollCalls.push(opts);
      mockWindow.scrollY = opts.top;
      mockWindow.pageYOffset = opts.top;
      mockDocument.documentElement.scrollTop = opts.top;
    },
  };

  function flushAnimationFrames() {
    while (rafQueue.length > 0) {
      const next = rafQueue.shift();
      next();
    }
  }

  return {
    mockWindow,
    mockDocument,
    scrollCalls,
    focusCalls,
    historyCalls,
    flushAnimationFrames,
  };
}

function testFirstClickDesktopAndMobile() {
  // Desktop first click after page load (scrollY starts at 0)
  {
    const env = createSimulatedEnvironment({ reducedMotion: false, isMobile: false });
    const nav = loadAnchorNavigationModule(env.mockWindow, env.mockDocument);

    const scheduled = nav.scrollToSectionById('marcas');
    assert.equal(scheduled, true);
    env.flushAnimationFrames();

    assert.equal(env.scrollCalls.length, 1, 'First click on Marcas (desktop) must execute exactly 1 scrollTo');
    assert.equal(env.scrollCalls[0].top, 720 - 16, 'First click on Marcas (desktop) must scroll directly down to #marcas');
    assert.equal(env.scrollCalls[0].behavior, 'smooth');
    assert.equal(env.mockWindow.location.hash, '#marcas');
    assert.equal(env.focusCalls[0].id, 'marcas');
    assert.equal(env.focusCalls[0].opts.preventScroll, true);

    // Clicking a brand card inside #marcas on the first visit scrolls down to #catalogo
    nav.scrollToSectionById('catalogo');
    env.flushAnimationFrames();
    assert.equal(env.scrollCalls.length, 2);
    assert.ok(
      env.scrollCalls[1].top > env.scrollCalls[0].top,
      'First click on a brand card inside #marcas must scroll DOWN to #catalogo, never up'
    );
    assert.equal(env.scrollCalls[1].top, 1080 - 16);
  }

  // Mobile first click after page load + reduced motion enabled
  {
    const env = createSimulatedEnvironment({ reducedMotion: true, isMobile: true });
    const nav = loadAnchorNavigationModule(env.mockWindow, env.mockDocument);

    nav.scrollToSectionById('marcas');
    env.flushAnimationFrames();

    assert.equal(env.scrollCalls.length, 1, 'First click on Marcas (mobile) must execute 1 scrollTo');
    assert.equal(env.scrollCalls[0].top, 640 - 16, 'First click on Marcas (mobile) must scroll directly down to #marcas');
    assert.equal(
      env.scrollCalls[0].behavior,
      'auto',
      'prefers-reduced-motion: reduce must use behavior: auto instead of smooth'
    );
    assert.equal(env.mockWindow.location.hash, '#marcas');
    assert.equal(env.focusCalls[0].id, 'marcas');
    assert.equal(env.focusCalls[0].opts.preventScroll, true);
  }
}

testStaticCodeContracts();
testFirstClickDesktopAndMobile();
console.log('Anchor scroll navigation tests passed (desktop, mobile, keyboard focus, reduced-motion).');
