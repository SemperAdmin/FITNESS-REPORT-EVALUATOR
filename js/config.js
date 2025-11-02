// Lightweight client-side API base configuration.
// Defaults to current origin if http(s); otherwise falls back to local server.
(function () {
  try {
    var origin = window.location.origin || '';
    var isHttp = origin.startsWith('http://') || origin.startsWith('https://');
    window.API_BASE_URL = isHttp ? origin : 'http://127.0.0.1:5173';
  } catch (e) {
    window.API_BASE_URL = 'http://127.0.0.1:5173';
  }
})();

