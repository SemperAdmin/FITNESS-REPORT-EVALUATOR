// Lightweight client-side API base configuration.
// Defaults to current origin if http(s); otherwise falls back to local server.
(function () {
  try {
    var origin = window.location.origin || '';
    var override = window.API_BASE_URL_OVERRIDE || localStorage.getItem('api_base_url') || '';
    var isHttp = function (u) { return typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')); };
    var base = override && isHttp(override) ? override : (isHttp(origin) ? origin : 'http://127.0.0.1:5173');
    // Normalize by removing trailing slash
    if (base.endsWith('/')) base = base.slice(0, -1);
    window.API_BASE_URL = base;
  } catch (e) {
    window.API_BASE_URL = 'http://127.0.0.1:5173';
  }
})();
