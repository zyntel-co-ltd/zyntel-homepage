// preview-nav.js
// Include this in every client design HTML file: <script src="/clients/preview-nav.js"></script>
// It propagates the ?token= param to all internal links so navigation works end-to-end.
(function () {
  var token = new URLSearchParams(window.location.search).get('token');
  if (!token) return;
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
