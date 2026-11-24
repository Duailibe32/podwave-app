window.__pwaDeferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  window.__pwaDeferredPrompt = e;
  window.dispatchEvent(new Event('podwave:pwa-prompt-ready'));
});
window.addEventListener('appinstalled', function() {
  window.__pwaDeferredPrompt = null;
  window.dispatchEvent(new Event('podwave:pwa-installed'));
});
