// preview-nav.js
// Include this in every client design HTML file: <script src="/clients/preview-nav.js"></script>
// It propagates the ?token= param to all internal links so navigation works end-to-end.
(function () {
  var token = new URLSearchParams(window.location.search).get('token');
  if (!token) return;

  // --- Tracking (public /p/* bypass) ---
  // Records view + time on page in Neon for admin panel tracking.
  // Best-effort only: failures are ignored.
  var start = Date.now();
  function sendEvent(payload) {
    try {
      payload = payload || {};
      payload.token = token;
      payload.page = payload.page || (location.pathname + location.search);
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/p/event', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/p/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function(){});
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
      if (href.startsWith('http') || href.startsWith('mailto:') ||
          href.startsWith('tel:') || href.startsWith('#') ||
          href.startsWith('javascript:')) return;
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
