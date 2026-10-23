/* AIS — shared behavior (theme, progress, TOC, diagrams, filters). */
(function () {
  var root = document.documentElement;

  /* == THEME (shared "theme" key with the home page) == */
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0F0E17' : '#F8F7FF');
    try { localStorage.setItem('theme', t); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });
  setTheme(root.getAttribute('data-theme') || 'light');

  /* == READING PROGRESS == */
  var bar = document.querySelector('.progress span');
  if (bar) {
    var tick = false;
    var update = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
      tick = false;
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* == TOC ACTIVE LINK == */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc nav a[href^="#"]'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && byId[en.target.id]) {
          tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
          byId[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-90px 0px -65% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* == DIAGRAMS == */
  document.querySelectorAll('.diagram').forEach(function (fig) {
    var nodes = Array.prototype.slice.call(fig.querySelectorAll('[data-node]'));
    var dNum = fig.querySelector('[data-detail-num]');
    var dTitle = fig.querySelector('[data-detail-title]');
    var dText = fig.querySelector('[data-detail-text]');

    function pick(el) {
      nodes.forEach(function (n) { if (n.tagName === 'BUTTON') n.setAttribute('aria-pressed', n === el ? 'true' : 'false'); });
      if (dNum) dNum.textContent = el.getAttribute('data-num') || '';
      if (dTitle) dTitle.textContent = el.getAttribute('data-title') || el.textContent.trim();
      if (dText) dText.textContent = el.getAttribute('data-desc') || '';
    }
    nodes.forEach(function (n) { n.addEventListener('click', function () { pick(n); }); });
    var start = fig.querySelector('[data-node][data-start]') || nodes[0];
    if (start) pick(start);

    var modeBtns = Array.prototype.slice.call(fig.querySelectorAll('[data-mode-btn]'));
    var pathEls = Array.prototype.slice.call(fig.querySelectorAll('[data-path]'));
    function setMode(m) {
      fig.setAttribute('data-mode', m);
      /* Generic path dimming: any mode name works; "full" shows everything. */
      pathEls.forEach(function (el) {
        var on = m === 'full' || (' ' + el.getAttribute('data-path') + ' ').indexOf(' ' + m + ' ') > -1;
        el.classList.toggle('is-dim', !on);
      });
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode-btn') === m ? 'true' : 'false'); });
      fig.querySelectorAll('[data-label-' + m + ']').forEach(function (el) {
        el.textContent = el.getAttribute('data-label-' + m);
      });
      var note = fig.querySelector('[data-mode-note]');
      var src = modeBtns.filter(function (b) { return b.getAttribute('data-mode-btn') === m; })[0];
      if (note && src) note.textContent = src.getAttribute('data-note') || '';
    }
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode-btn')); }); });
    if (modeBtns.length) setMode(fig.getAttribute('data-mode') || modeBtns[0].getAttribute('data-mode-btn'));

    var fs = fig.querySelector('[data-fullscreen]');
    if (fs) {
      if (!fig.requestFullscreen) { fs.hidden = true; }
      else {
        fs.addEventListener('click', function () {
          if (document.fullscreenElement) document.exitFullscreen();
          else fig.requestFullscreen().catch(function () {});
        });
        document.addEventListener('fullscreenchange', function () {
          var on = document.fullscreenElement === fig;
          fs.querySelector('span').textContent = on ? 'Exit full screen' : 'Full screen';
        });
      }
    }
  });

  /* == LISTING FILTERS (built from the cards' data-tags) == */
  var chipWrap = document.querySelector('[data-filters]');
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-tags]'));

  /* A card left alone on the last row stretches across it (no lonely card). */
  function balance() {
    var shown = cards.filter(function (c) { return !c.hidden; });
    cards.forEach(function (c) { c.classList.remove('card--wide'); });
    var last = shown[shown.length - 1], prev = shown[shown.length - 2];
    if (last && prev && !last.classList.contains('card--featured') && last.offsetTop > prev.offsetTop + 4) {
      last.classList.add('card--wide');
    }
  }
  if (cards.length) {
    balance();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(balance, 120); });
  }
  if (chipWrap && cards.length) {
    var labels = {};
    cards.forEach(function (c) {
      c.getAttribute('data-tags').split(/\s+/).forEach(function (t) {
        if (t) labels[t] = t.replace(/-/g, ' ').replace(/\b\w/g, function (s) { return s.toUpperCase(); });
      });
    });
    var tags = Object.keys(labels);
    if (tags.length < 2 || cards.length < 3) { chipWrap.hidden = true; }
    else {
      var empty = document.querySelector('[data-empty]');
      var make = function (key, text) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.textContent = text;
        b.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
        b.addEventListener('click', function () {
          chipWrap.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          var shown = 0;
          cards.forEach(function (c) {
            var ok = key === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + key + ' ') > -1;
            c.hidden = !ok; if (ok) shown++;
          });
          if (empty) empty.hidden = shown > 0;
          balance();
        });
        chipWrap.appendChild(b);
      };
      make('all', 'All');
      tags.sort().forEach(function (t) { make(t, labels[t]); });
    }
  }
})();
