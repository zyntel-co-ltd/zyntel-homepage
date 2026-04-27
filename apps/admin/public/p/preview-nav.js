// preview-nav.js
// Include this in every preview HTML file:
//   <script src="/p/preview-nav.js"></script>
// It propagates the ?token= param to all internal links so navigation works end-to-end.
(function () {
  var token = new URLSearchParams(window.location.search).get('token');
  if (!token) return;

  // --- Tracking (public /p/* bypass) ---
  // Records view + time on page in Neon for admin panel tracking.
  // Best-effort only: failures are ignored.
  var start = Date.now();
  function getSessionId() {
    try {
      var key = 'zyntel_preview_session_id_' + token;
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var sid = (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      localStorage.setItem(key, sid);
      return sid;
    } catch (e) {
      return null;
    }
  }
  var sessionId = getSessionId();
  function sendEvent(payload) {
    try {
      payload = payload || {};
      payload.token = token;
      payload.sessionId = payload.sessionId || sessionId;
      payload.page = payload.page || (location.pathname + location.search);
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/p/event', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/p/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function(){});
      }
    } catch (e) {}
  }

  // page opened
  sendEvent({ eventType: 'page_open' });

  // page closed (duration)
  window.addEventListener('pagehide', function () {
    var dur = Math.max(0, Math.round((Date.now() - start) / 1000));
    sendEvent({ eventType: 'page_close', durationSeconds: dur });
  });

  function patchLinks() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        href.startsWith('javascript:')
      ) return;
      try {
        var url = new URL(href, window.location.href);
        if (url.hostname !== window.location.hostname) return;
        url.searchParams.set('token', token);
        a.setAttribute('href', url.pathname + url.search + url.hash);
      } catch (e) {}
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchLinks);
  } else {
    patchLinks();
  }
})();

