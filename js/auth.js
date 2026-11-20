/* Simple front-door login for a static site (no server).
   IMPORTANT: this only hides the dashboard page. data/data.json is still a public file on a static host.
   Add or change users with:  python scripts/make_user.py <username>   then paste the printed line into USERS. */
(function () {
  'use strict';
  var USERS = {
    // username: { salt, hash }   hash = SHA-256( salt + ':' + username + ':' + password )
    'admin': { salt: 'e2da2e15d0924341', hash: 'db95faa02c13887313cca94efa806139ea6c5cdd7c7aad7329e0df33dbfadb84' }
  };
  var KEY = 'dash.auth', TTL = 8 * 60 * 60 * 1000;   // session lasts 8 hours (until the tab is closed)
  var FAIL = 'dash.fail', MAX_TRIES = 5, LOCK_MS = 30 * 1000;

  function sha256(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error('insecure'));
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function session() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY));
      return s && s.exp > Date.now() ? s : null;
    } catch (e) { return null; }
  }
  function lockLeft() {
    try {
      var f = JSON.parse(localStorage.getItem(FAIL)) || {};
      return f.until && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
    } catch (e) { return 0; }
  }
  function recordFail() {
    var f = {};
    try { f = JSON.parse(localStorage.getItem(FAIL)) || {}; } catch (e) { f = {}; }
    f.n = (f.n || 0) + 1;
    if (f.n >= MAX_TRIES) { f.until = Date.now() + LOCK_MS; f.n = 0; }
    try { localStorage.setItem(FAIL, JSON.stringify(f)); } catch (e) { /* ignore */ }
  }

  window.Auth = {
    user: function () { var s = session(); return s ? s.u : null; },
    lockLeft: lockLeft,
    /* resolves to true / false; rejects if the browser cannot hash (needs https or localhost) */
    login: function (username, password) {
      username = String(username || '').trim().toLowerCase();
      var u = USERS[username];
      return sha256((u ? u.salt : 'x') + ':' + username + ':' + password).then(function (h) {
        if (u && h === u.hash) {
          try { localStorage.removeItem(FAIL); sessionStorage.setItem(KEY, JSON.stringify({ u: username, exp: Date.now() + TTL })); } catch (e) { return false; }
          return true;
        }
        recordFail();
        return false;
      });
    },
    logout: function () { try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } location.replace('index.html'); },
    /* call at the top of a protected page */
    require: function () { if (!session()) location.replace('index.html'); }
  };
})();
