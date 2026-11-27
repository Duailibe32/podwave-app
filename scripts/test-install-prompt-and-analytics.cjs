const assert = require('node:assert/strict'), fs = require('node:fs');
const pwa = fs.readFileSync('src/components/PWAInstallButton.tsx', 'utf8');
assert.match(pwa, /bannerDismissed \|\| !hasOrdered/, 'smart banner waits for the first order');
assert.match(pwa, /currentUser\?\.orderHistory\?\.length/, 'first order comes from the customer history');
assert.doesNotMatch(fs.readFileSync('src/components/Header.tsx', 'utf8'), /variant="header"/, 'no install button in the header bar');
assert.match(fs.readFileSync('src/components/Header.tsx', 'utf8'), /variant="banner"/, 'install entry stays in the menu');
assert.match(fs.readFileSync('src/components/Footer.tsx', 'utf8'), /variant="footer-tooltip"/, 'footer hint stays');
assert.match(fs.readFileSync('index.html', 'utf8'), /<script defer src="\/_vercel\/insights\/script\.js"><\/script>/, 'Vercel Web Analytics loaded from the same origin');
console.log('PASS: single install invite (menu and footer; floating banner only after the first order) and same-origin analytics script. Static checks only.');
