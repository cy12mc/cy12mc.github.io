/* cy12 的数学小组 — 共享交互层：主题持久化 + 搜索 */
(function () {
  'use strict';

  var THEME_KEY = 'cy12-blog-theme';
  var root = document.documentElement;

  var MOON = '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>';
  var SUN = '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.3" y1="5.3" x2="7" y2="7"/><line x1="17" y1="17" x2="18.7" y2="18.7"/><line x1="5.3" y1="18.7" x2="7" y2="17"/><line x1="17" y1="7" x2="18.7" y2="5.3"/>';

  function isLight() { return root.getAttribute('data-theme') === 'light'; }

  function paintThemeButton(btn) {
    if (!btn) return;
    var light = isLight();
    btn.setAttribute('aria-pressed', String(light));
    btn.setAttribute('aria-label', light ? '切换到深色' : '切换到浅色');
    var svg = btn.querySelector('svg');
    if (svg) svg.innerHTML = light ? SUN : MOON;
  }

  var themeBtn = document.getElementById('themeBtn');
  paintThemeButton(themeBtn);
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = isLight() ? 'dark' : 'light';
      if (next === 'light') root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* 隐私模式下忽略 */ }
      paintThemeButton(themeBtn);
    });
  }

  /* ── 章节：默认折叠，点击展开 / 再点收回 ────────────────── */
  var chapterButtons = document.querySelectorAll('.chapter-row');
  Array.prototype.forEach.call(chapterButtons, function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      var opened = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!opened));
      panel.classList.toggle('is-open', !opened);
      // 收起时立刻移出交互与无障碍树，展开动画期间仍保持可访问
      panel.inert = opened;
      panel.setAttribute('aria-hidden', String(opened));
    });
  });

  /* ── 搜索 ────────────────────────────────────────────────── */
  var searchBtn = document.getElementById('searchBtn');
  var overlay = document.getElementById('searchModal');
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');

  if (searchBtn && overlay && input && results) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.article-row'));
    var articles = rows.map(function (row) {
      var titleEl = row.querySelector('.article-title');
      return {
        title: row.getAttribute('data-title') || (titleEl ? titleEl.textContent.trim() : ''),
        summary: row.getAttribute('data-summary') || '',
        tags: row.getAttribute('data-tags') || '',
        chapter: row.getAttribute('data-chapter') || '',
        href: row.getAttribute('href') || ''
      };
    });

    var counter = document.getElementById('articleCount');
    if (counter) counter.textContent = articles.length + ' 篇';

    var activeIndex = -1;
    var lastFocused = null;

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function highlight(text, query) {
      var safe = escapeHtml(text);
      if (!query) return safe;
      var pattern = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        return safe.replace(new RegExp(pattern, 'gi'), function (m) { return '<mark>' + m + '</mark>'; });
      } catch (e) { return safe; }
    }

    function render(query) {
      var q = query.trim();
      activeIndex = -1;
      if (!q) { results.innerHTML = ''; return; }
      var needle = q.toLowerCase();
      var hits = articles.filter(function (a) {
        return (a.title + ' ' + a.summary + ' ' + a.tags + ' ' + a.chapter).toLowerCase().indexOf(needle) !== -1;
      });
      if (!hits.length) {
        results.innerHTML = '<p class="search-empty">没有匹配的笔记</p>';
        return;
      }
      results.innerHTML = hits.map(function (a) {
        return '<a class="search-hit" href="' + escapeHtml(a.href) + '">' +
          (a.chapter ? '<span class="hit-chapter">' + escapeHtml(a.chapter) + ' ›</span>' : '') +
          '<span class="hit-title">' + highlight(a.title, q) + '</span>' +
          (a.summary ? '<span class="hit-summary">' + escapeHtml(a.summary.slice(0, 70)) + '</span>' : '') +
          '</a>';
      }).join('');
    }

    function hits() { return Array.prototype.slice.call(results.querySelectorAll('.search-hit')); }

    function setActive(index) {
      var list = hits();
      if (!list.length) return;
      if (index < 0) index = list.length - 1;
      if (index >= list.length) index = 0;
      activeIndex = index;
      list.forEach(function (el, i) { el.classList.toggle('is-active', i === activeIndex); });
      list[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function openSearch() {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      input.value = '';
      render('');
      input.focus();
    }

    function closeSearch() {
      overlay.hidden = true;
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    searchBtn.addEventListener('click', openSearch);
    input.addEventListener('input', function () { render(input.value); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch(); });
    results.addEventListener('mousemove', function (e) {
      var hit = e.target.closest ? e.target.closest('.search-hit') : null;
      if (hit) setActive(hits().indexOf(hit));
    });

    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement ? document.activeElement.tagName : '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === '/' && overlay.hidden && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); openSearch(); return;
      }
      if (overlay.hidden) return;

      if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') {
        var list = hits();
        if (!list.length) return;
        e.preventDefault();
        window.location.href = list[activeIndex >= 0 ? activeIndex : 0].getAttribute('href');
      }
    });
  }
})();
