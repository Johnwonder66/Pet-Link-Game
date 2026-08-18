export function registerPWA() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    const register = async () => {
      const workerUrl = new URL('../sw.js', import.meta.url);
      try {
        const registration = await navigator.serviceWorker.register(workerUrl, {
          scope: './',
          updateViaCache: 'none'
        });
        await registration.update();
      } catch (error) {
        console.warn('PWA 离线功能注册失败，游戏仍可在线运行。', error);
      }
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(register, { timeout: 1800 });
    else window.setTimeout(register, 250);
  }, { once: true });
}
