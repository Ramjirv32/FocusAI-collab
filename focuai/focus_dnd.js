(function() {
  try {
    const code = `(function() {
      try {
        const OriginalNotification = window.Notification;
        function noop() {}
        // Deny notifications
        window.Notification = function() { return null; };
        window.Notification.requestPermission = function(cb) {
          const result = 'denied';
          if (typeof cb === 'function') cb(result);
          return Promise.resolve(result);
        };
        Object.defineProperty(window.Notification, 'permission', { get: () => 'denied' });
        // Silence blocking dialogs
        window.alert = noop;
        window.confirm = function() { return false; };
        window.prompt = function() { return null; };
        // Mute media elements
        const muteMedia = () => {
          try {
            const mediaElements = document.querySelectorAll('video,audio');
            mediaElements.forEach(el => { try { el.muted = true; el.volume = 0; } catch (_) {} });
          } catch (_) {}
        };
        muteMedia();
        try {
          new MutationObserver(muteMedia).observe(document.documentElement, { childList: true, subtree: true });
        } catch (_) {}
        try { console.debug('Focus DND script applied'); } catch (_) {}
      } catch (e) {}
    })();`;
    const s = document.createElement('script');
    s.textContent = code;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {
    // swallow
  }
})();


