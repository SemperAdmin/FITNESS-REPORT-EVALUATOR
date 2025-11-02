// Lightweight client-side API base configuration.
// Defaults to current origin if http(s); otherwise falls back to local server.
(function () {
  try {
    const origin = window.location.origin || '';
    const override = window.API_BASE_URL_OVERRIDE || '';
    const isHttp = (u) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'));
    let base = override && isHttp(override) ? override : (isHttp(origin) ? origin : 'http://127.0.0.1:5173');
    // Normalize by removing trailing slash
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    window.API_BASE_URL = base;
  } catch (e) {
    window.API_BASE_URL = 'http://127.0.0.1:5173';
  }
})();
