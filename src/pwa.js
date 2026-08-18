export function registerPWA() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

  window.addEventListener('load', () => {
    const workerUrl = new URL('../sw.js', import.meta.url);
    navigator.serviceWorker.register(workerUrl, { scope: './' }).catch((error) => {
      console.warn('PWA 离线功能注册失败，游戏仍可在线运行。', error);
    });
  }, { once: true });
}
