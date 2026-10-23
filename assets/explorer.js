/* Architecture explorer: a zoomable tree for each project.
   Overview = the whole system as a tree (root -> branches -> leaves).
   Tap a branch (or a leaf) to zoom into it; tap a node with children to zoom again.
   Data: data/trees/<id>.json (format in tools/trees/SCHEMA.md).
   No dependencies. */
(() => {
  'use strict';

  const KIND = {
    input:    { c: '#475569', n: 'Input' },
    process:  { c: '#4F46E5', n: 'Processing' },
    ai:       { c: '#E04E72', n: 'AI / model' },
    agent:    { c: '#9333EA', n: 'Agent' },
    store:    { c: '#0F766E', n: 'Storage' },
    output:   { c: '#D86D2E', n: 'Output' },
    test:     { c: '#15803D', n: 'Testing' },
    security: { c: '#B42318', n: 'Security' },
    tool:     { c: '#0E7490', n: 'Tools' },
    infra:    { c: '#334155', n: 'Infra' },
    ui:       { c: '#B45309', n: 'UI' },
  };
  const FLAGS = [
    { id: 'ai', label: 'AI & agents', match: n => has(n, 'ai') || has(n, 'agent') || n.kind === 'ai' || n.kind === 'agent' },
    { id: 'test', label: 'Testing', match: n => has(n, 'test') || n.kind === 'test' },
    { id: 'security', label: 'Security', match: n => has(n, 'security') || n.kind === 'security' },
    { id: 'tool', label: 'Tools', match: n => has(n, 'tool') || n.kind === 'tool' },
    { id: 'next', label: 'Coming next', match: n => n.status === 'coming' || n.status === 'proposal' },
  ];
  const BADGE = { ai: 'AI', agent: 'Agent', test: 'Test', security: 'Sec', tool: 'Tool' };

  function has(n, f) { return Array.isArray(n.flags) && n.flags.includes(f); }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function count(n) { return (n.children || []).reduce((a, c) => a + 1 + count(c), 0); }
  function walk(n, fn, parent) { fn(n, parent); (n.children || []).forEach(c => walk(c, fn, n)); }

  class Explorer {
    constructor(el) {
      this.el = el;
      this.path = [];          // ids from root's child down
      this.view = null;        // 'today' | 'proposal' for trees with views
      this.filter = null;      // flag id
      this.mode = 'diagram';   // 'diagram' | 'tree'
      this.el.classList.add('tx');
      this.el.innerHTML = '<div class="tx__loading">Loading the architecture…</div>';
    }

    async load() {
      try {
        const res = await fetch(this.el.dataset.tree, { cache: 'no-cache' });
        this.data = await res.json();
      } catch (e) {
        this.el.innerHTML = '<p class="tx__err">The architecture map could not load. Refresh to try again.</p>';
        return;
      }
      this.byId = {};
      walk(this.data, (n, p) => { n._parent = p; if (n.id) this.byId[n.id] = n; });
      this.view = this.data.views ? this.data.views[0].id : null;
      this.build();
      this.render(false);
    }

    visible(n) { return this.view !== 'today' || n.status !== 'proposal'; }
    kids(n) { return (n.children || []).filter(c => this.visible(c)); }

    build() {
      const d = this.data;
      this.el.innerHTML = `
        <div class="tx__bar">
          <div class="tx__crumbs" aria-live="polite"></div>
          <div class="tx__actions">
            <div class="tx__modes" role="group" aria-label="How to show it">
              <button type="button" class="tx__mode" data-mode="diagram">Diagram</button>
              <button type="button" class="tx__mode" data-mode="tree">Tree</button>
            </div>
            ${d.views ? `<div class="tx__views" role="group" aria-label="Which version">${d.views.map(v =>
              `<button type="button" class="tx__view" data-view="${esc(v.id)}">${esc(v.label)}</button>`).join('')}</div>` : ''}
            <button type="button" class="tx__full" aria-label="Open full screen" title="Full screen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
          </div>
        </div>
        <div class="tx__filters" role="group" aria-label="Highlight">
          <span class="tx__hint">Highlight:</span>
          ${FLAGS.map(f => `<button type="button" class="tx__chip" data-flag="${f.id}" aria-pressed="false">${esc(f.label)} <b></b></button>`).join('')}
        </div>
        <div class="tx__stage"></div>
        <div class="tx__foot"><span class="tx__total"></span>${d.note ? `<span class="tx__note">${esc(d.note)}</span>` : ''}</div>`;
      this.stage = this.el.querySelector('.tx__stage');
      this.crumbs = this.el.querySelector('.tx__crumbs');

      this.el.addEventListener('click', e => this.onClick(e));
      this.el.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.el.classList.contains('tx--full')) this.toggleFull(false);
      });
      this.el.addEventListener('mouseover', e => this.onHover(e, true));
      this.el.addEventListener('mouseout', e => this.onHover(e, false));
      let rt;
      new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { this.drawLinks(); this.drawArrows(); }, 60); }).observe(this.stage);
    }

    updateChrome() {
      this.el.querySelectorAll('.tx__view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === this.view)));
      this.el.querySelectorAll('.tx__mode').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === this.mode)));
      this.el.classList.toggle('tx--diagram', this.mode === 'diagram' && !this.path.length);
      // filter counts reflect what's visible in this view
      const vis = [];
      walk(this.data, n => { if (n !== this.data && this.visible(n)) vis.push(n); });
      this.el.querySelectorAll('.tx__chip').forEach(b => {
        const f = FLAGS.find(x => x.id === b.dataset.flag);
        const k = vis.filter(f.match).length;
        b.querySelector('b').textContent = k;
        b.hidden = k === 0;
        b.setAttribute('aria-pressed', String(this.filter === f.id));
      });
      this.el.classList.toggle('tx--filtering', !!this.filter);
      this.el.querySelector('.tx__total').textContent = `${vis.length} parts · ${this.mode === 'diagram' && !this.path.length ? 'tap a box to zoom into it' : 'tap any branch to zoom in'}`;
      const parts = [`<button type="button" class="tx__crumb" data-go="-1">${esc(this.data.name)}</button>`];
      this.path.forEach((id, i) => parts.push(`<span aria-hidden="true">›</span><button type="button" class="tx__crumb" data-go="${i}">${esc(this.byId[id].title)}</button>`));
      this.crumbs.innerHTML = parts.join('');
    }

    /* ---------- rendering ---------- */
    render(animateFrom) {
      const node = this.path.length ? this.byId[this.path[this.path.length - 1]] : this.data;
      const html = this.path.length ? this.focusHTML(node) : (this.mode === 'diagram' ? this.diagramHTML() : this.overviewHTML());
      const old = this.stage.firstElementChild;
      const wrap = document.createElement('div');
      wrap.className = 'tx__view-wrap';
      wrap.innerHTML = html;
      this.stage.replaceChildren(wrap);
      this.updateChrome();
      this.applyFilter();
      this.clamp();
      this.drawLinks();
      this.drawArrows();
      if (animateFrom && !reduce()) this.zoomIn(wrap, animateFrom, animateFrom === 'out');
      if (old && !animateFrom) { /* first paint */ }
    }

    flagBadges(n) {
      const f = (n.flags || []).filter(x => BADGE[x]);
      return f.length ? `<span class="tx__badges">${f.map(x => `<i class="tx__b tx__b--${x}">${BADGE[x]}</i>`).join('')}</span>` : '';
    }
    statusBadge(n) {
      if (n.status === 'coming') return '<span class="tx__status tx__status--coming">Coming</span>';
      if (n.status === 'proposal') return '<span class="tx__status tx__status--proposal">Proposal</span>';
      return '';
    }
    nodeAttrs(n) {
      const k = KIND[n.kind] || KIND.process;
      const cls = [n.status === 'coming' && 'is-coming', n.status === 'proposal' && 'is-proposal'].filter(Boolean).join(' ');
      return `data-id="${esc(n.id)}" style="--k:${k.c}" class="${cls}"`;
    }

    overviewHTML() {
      const d = this.data;
      const branches = this.kids(d);
      const rows = branches.map(b => {
        const leaves = this.kids(b);
        const preview = leaves.slice(0, 3).map(l => l.title).join(' · ') + (leaves.length > 3 ? ` · +${leaves.length - 3}` : '');
        return `
          <div class="tx__row" data-row="${esc(b.id)}">
            <button type="button" ${this.nodeAttrs(b).replace('class="', 'class="tx__branch ')} aria-label="Zoom into ${esc(b.title)}" title="${esc(b.summary)}">
              <span class="tx__kind">${esc((KIND[b.kind] || KIND.process).n)}</span>
              <span class="tx__btitle">${esc(b.title)} ${this.statusBadge(b)}</span>
              <span class="tx__bsum">${esc(b.summary)}</span>
              <span class="tx__bprev">${esc(preview)}</span>
              <span class="tx__bmeta">${b.metric ? `<em>${esc(b.metric)}</em>` : ''}${this.flagBadges(b)}<span class="tx__go">${leaves.length ? leaves.length + ' parts' : 'Open'} →</span></span>
            </button>
            <div class="tx__leaves">${leaves.map(l => `<button type="button" ${this.nodeAttrs(l).replace('class="', 'class="tx__leaf ')} data-branch="${esc(b.id)}" title="${esc(l.summary)}">${esc(l.title)}${(this.kids(l).length) ? ` <small>+${this.kids(l).length}</small>` : ''}</button>`).join('')}</div>
          </div>`;
      }).join('');
      return `
        <div class="tx__overview">
          <svg class="tx__links" aria-hidden="true"></svg>
          <div class="tx__root">
            <span class="tx__rootname">${esc(d.name)}</span>
            <span class="tx__roottag">${esc(d.tagline || '')}</span>
          </div>
          <div class="tx__rows">${rows}</div>
          <button type="button" class="tx__more" hidden>Show the whole tree ↓</button>
        </div>`;
    }

    focusHTML(n) {
      const k = KIND[n.kind] || KIND.process;
      const kids = this.kids(n);
      const links = (this.data.links || []).filter(l => this.byId[l.from] && this.byId[l.to] && this.visible(this.byId[l.from]) && this.visible(this.byId[l.to]));
      const out = links.filter(l => l.from === n.id), inn = links.filter(l => l.to === n.id);
      const conn = (out.length || inn.length) ? `
        <div class="tx__conn">
          ${inn.map(l => `<button type="button" class="tx__cl" data-jump="${esc(l.from)}">← ${esc(this.byId[l.from].title)} <small>${esc(l.label)}</small></button>`).join('')}
          ${out.map(l => `<button type="button" class="tx__cl" data-jump="${esc(l.to)}">${esc(this.byId[l.to].title)} → <small>${esc(l.label)}</small></button>`).join('')}
        </div>` : '';
      const cards = kids.map((c, i) => {
        const g = this.kids(c);
        return `
          <article ${this.nodeAttrs(c).replace('class="', 'class="tx__card ')}>
            <div class="tx__ctop"><span class="tx__kind">${esc((KIND[c.kind] || KIND.process).n)}</span>${this.statusBadge(c)}${this.flagBadges(c)}</div>
            <h4 class="tx__ctitle">${esc(c.title)}</h4>
            <p class="tx__csum">${esc(c.summary)}</p>
            ${c.detail ? `<p class="tx__cdet">${esc(c.detail)}</p>` : ''}
            ${(c.metric || (c.tech && c.tech.length)) ? `<div class="tx__ctech">${c.metric ? `<em>${esc(c.metric)}</em>` : ''}${(c.tech || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
            ${g.length ? `<button type="button" class="tx__deeper" data-open="${esc(c.id)}">Zoom in: ${g.length} more →</button>` : ''}
          </article>${n.flow && i < kids.length - 1 ? '<div class="tx__arrow" aria-hidden="true"></div>' : ''}`;
      }).join('');
      return `
        <div class="tx__focus" style="--k:${k.c}">
          <button type="button" class="tx__back" data-go="${this.path.length - 2}">← ${this.path.length > 1 ? esc(this.byId[this.path[this.path.length - 2]].title) : 'Whole system'}</button>
          <div class="tx__fhead ${n.status === 'proposal' ? 'is-proposal' : ''} ${n.status === 'coming' ? 'is-coming' : ''}">
            <span class="tx__kind">${esc(k.n)}</span>
            <h3 class="tx__ftitle">${esc(n.title)} ${this.statusBadge(n)}</h3>
            <p class="tx__fsum">${esc(n.summary)}</p>
            ${n.detail ? `<p class="tx__fdet">${esc(n.detail)}</p>` : ''}
            ${(n.metric || (n.tech && n.tech.length)) ? `<div class="tx__ctech">${n.metric ? `<em>${esc(n.metric)}</em>` : ''}${(n.tech || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
            ${conn}
          </div>
          ${kids.length ? `<div class="tx__cards ${n.flow ? 'tx__cards--flow' : ''}">${cards}</div>` : ''}
        </div>`;
    }

    expandAll() {
      this.expanded = true;
      const ov = this.stage.querySelector('.tx__overview, .tx__diagram');
      if (ov) { ov.classList.remove('is-clamped'); ov.style.maxHeight = ''; const m = ov.querySelector('.tx__more'); if (m) m.hidden = true; requestAnimationFrame(() => { this.drawLinks(); this.drawArrows(); }); }
    }

    clamp() {
      const ov = this.stage.querySelector('.tx__overview, .tx__diagram');
      if (!ov || this.expanded) return;
      const lim = this.el.classList.contains('tx--full') ? 1e9 : (ov.offsetWidth >= 560 ? 720 : 640);
      const more = ov.querySelector('.tx__more');
      if (ov.scrollHeight > lim + 80) { ov.classList.add('is-clamped'); ov.style.maxHeight = lim + 'px'; more.hidden = false; }
    }

    /* ---------- diagram: branches as boxes in data-flow order ---------- */
    layout() {
      const br = this.kids(this.data);
      const ids = new Set(br.map(b => b.id));
      const links = (this.data.links || []).filter(l => ids.has(l.from) && ids.has(l.to) && l.from !== l.to);
      const inc = {}, out = {};
      br.forEach(b => { inc[b.id] = 0; out[b.id] = 0; });
      links.forEach(l => { inc[l.to]++; out[l.from]++; });
      // cross-cutting branches (testing, security, tooling, ops) that only point at others sit in an "always on" band
      const side = new Set(br.filter(b => ['test', 'security', 'tool', 'infra'].includes(b.kind) && inc[b.id] === 0 && b.status !== 'proposal').map(b => b.id)
        .concat(br.filter(b => inc[b.id] === 0 && out[b.id] === 0).map(b => b.id))
        // roadmap branches (all 'coming') belong at the bottom with the cross-cutting ones
        .concat(br.filter(b => b.status === 'coming' && inc[b.id] === 0).map(b => b.id)));
      const flow = br.filter(b => !side.has(b.id));
      const rank = {}; flow.forEach(b => { rank[b.id] = 0; });
      for (let k = 0; k < flow.length; k++) {
        let moved = false;
        links.forEach(l => {
          if (rank[l.from] === undefined || rank[l.to] === undefined) return;
          if (rank[l.to] < rank[l.from] + 1 && rank[l.from] + 1 < flow.length) { rank[l.to] = rank[l.from] + 1; moved = true; }
        });
        if (!moved) break;
      }
      const rows = [];
      flow.forEach(b => { (rows[rank[b.id]] = rows[rank[b.id]] || []).push(b); });
      return { rows: rows.filter(Boolean), side: br.filter(b => side.has(b.id)), links };
    }

    diagramHTML() {
      const { rows, side } = this.layout();
      const box = b => {
        const parts = this.kids(b);
        const show = parts.slice(0, 5);
        return `
          <button type="button" ${this.nodeAttrs(b).replace('class="', 'class="tx__dbox ')} aria-label="Zoom into ${esc(b.title)}">
            <span class="tx__dtop"><span class="tx__kind">${esc((KIND[b.kind] || KIND.process).n)}</span>${this.flagBadges(b)}</span>
            <span class="tx__dtitle">${esc(b.title)} ${this.statusBadge(b)}</span>
            ${b.metric ? `<em class="tx__dmetric">${esc(b.metric)}</em>` : ''}
            <span class="tx__dparts">${show.map(p => `<span class="tx__dpart" data-id="${esc(p.id)}">${esc(p.title)}</span>`).join('')}${parts.length > show.length ? `<span class="tx__dmore">+${parts.length - show.length} more</span>` : ''}</span>
          </button>`;
      };
      return `
        <div class="tx__diagram">
          <svg class="tx__arrows" aria-hidden="true"></svg>
          <div class="tx__droot"><b>${esc(this.data.name)}</b><span>${esc(this.data.tagline || '')}</span></div>
          ${rows.map((r, i) => `<div class="tx__drow" data-rank="${i}">${r.map(box).join('')}</div>`).join('')}
          ${side.length ? `<div class="tx__dside"><span class="tx__dside-l">Always on</span><div class="tx__drow tx__drow--side">${side.map(box).join('')}</div></div>` : ''}
          <button type="button" class="tx__more" hidden>Show the whole diagram ↓</button>
        </div>`;
    }

    drawArrows() {
      const dg = this.stage.querySelector('.tx__diagram');
      if (!dg) return;
      const svg = dg.querySelector('.tx__arrows');
      const R = dg.getBoundingClientRect();
      svg.setAttribute('width', R.width); svg.setAttribute('height', R.height);
      svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
      const rect = id => { const el = dg.querySelector(`.tx__dbox[data-id="${CSS.escape(id)}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left - R.left, t: r.top - R.top, r: r.right - R.left, b: r.bottom - R.top, w: r.width, h: r.height }; };
      const { links } = this.layout();
      const ports = {};
      const port = (id, side) => { const k = id + side; ports[k] = (ports[k] || 0) + 1; return ports[k] - 1; };
      const plan = links.map(l => {
        const a = rect(l.from), b = rect(l.to);
        if (!a || !b) return null;
        let s1, s2;
        if (b.t > a.b - 4) { s1 = 'b'; s2 = 't'; } else if (b.b < a.t + 4) { s1 = 't'; s2 = 'b'; } else { s1 = b.l > a.r ? 'r' : 'l'; s2 = b.l > a.r ? 'l' : 'r'; }
        return { l, a, b, s1, s2, i1: port(l.from, s1), i2: port(l.to, s2) };
      }).filter(Boolean);
      const total = {}; plan.forEach(p => { total[p.l.from + p.s1] = (total[p.l.from + p.s1] || 0) + 1; total[p.l.to + p.s2] = (total[p.l.to + p.s2] || 0) + 1; });
      const at = (r, side, i, n) => {
        const off = (i - (n - 1) / 2);
        if (side === 'b') return [r.l + r.w / 2 + off * Math.min(26, r.w / (n + 1)), r.b];
        if (side === 't') return [r.l + r.w / 2 + off * Math.min(26, r.w / (n + 1)), r.t];
        if (side === 'r') return [r.r, r.t + r.h / 2 + off * 14];
        return [r.l, r.t + r.h / 2 + off * 14];
      };
      const mid = this._mid || (this._mid = 'txa' + Math.random().toString(36).slice(2, 8));
      let g = '';
      plan.forEach(p => {
        const [x1, y1] = at(p.a, p.s1, p.i1, total[p.l.from + p.s1]);
        let [x2, y2] = at(p.b, p.s2, p.i2, total[p.l.to + p.s2]);
        const v = p.s1 === 'b' || p.s1 === 't';
        if (p.s2 === 't') y2 -= 7; else if (p.s2 === 'b') y2 += 7; else if (p.s2 === 'l') x2 -= 7; else x2 += 7;
        const dy = Math.max(30, Math.abs(y2 - y1) / 2), dx = Math.max(30, Math.abs(x2 - x1) / 2);
        const c = v ? `C${x1} ${y1 + (p.s1 === 'b' ? dy : -dy)} ${x2} ${y2 + (p.s2 === 't' ? -dy : dy)} ${x2} ${y2}`
                    : `C${x1 + (p.s1 === 'r' ? dx : -dx)} ${y1} ${x2 + (p.s2 === 'l' ? -dx : dx)} ${y2} ${x2} ${y2}`;
        const d = `M${x1} ${y1}${c}`;
        const lx = (x1 + x2) / 2, ly = (y1 + y2) / 2;
        const back = p.s1 === 't';
        g += `<g class="tx__arrow-g ${back ? 'is-back' : ''}" data-from="${esc(p.l.from)}" data-to="${esc(p.l.to)}">
          <path class="tx__ap" d="${d}" marker-end="url(#${mid})"/>${reduce() ? '' : `<path class="tx__apulse" d="${d}"/>`}
          ${p.l.label ? `<text x="${lx}" y="${ly}" class="tx__al">${esc(p.l.label)}</text>` : ''}</g>`;
      });
      svg.innerHTML = `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="tx__ah"/></marker></defs>${g}`;
    }

    /* ---------- desktop tree lines (root -> branches -> leaves) ---------- */
    drawLinks() {
      const ov = this.stage.querySelector('.tx__overview');
      if (!ov) return;
      const svg = ov.querySelector('.tx__links');
      const R = ov.getBoundingClientRect();
      const root = ov.querySelector('.tx__root').getBoundingClientRect();
      const wide = getComputedStyle(ov).getPropertyValue('--wide').trim() === '1';
      svg.setAttribute('width', R.width); svg.setAttribute('height', R.height);
      svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
      let p = '', t = '';
      if (wide) {
        const rows = [...ov.querySelectorAll('.tx__row')];
        const firstB = rows.length ? rows[0].querySelector('.tx__branch').getBoundingClientRect() : root;
        const rx = root.right - R.left, ry = root.top - R.top + Math.min(root.height / 2, 40);
        const tx = rx + (firstB.left - root.right) / 2;
        let maxY = ry, minY = ry;
        rows.forEach(row => {
          const b = row.querySelector('.tx__branch').getBoundingClientRect();
          const y = b.top - R.top + Math.min(b.height / 2, 30);
          maxY = Math.max(maxY, y); minY = Math.min(minY, y);
          const r = Math.min(10, Math.abs(y - ry));
          const dir = y >= ry ? 1 : -1;
          t += `M${tx} ${y - dir * r}Q${tx} ${y} ${tx + r} ${y}L${b.left - R.left} ${y}`;
          const lv = row.querySelector('.tx__leaves');
          if (lv.children.length) {
            const L = lv.getBoundingClientRect();
            const lx = L.left - R.left - 9, bx = b.right - R.left;
            t += `M${bx} ${y}L${lx} ${y}M${lx} ${Math.min(L.top - R.top + 11, y)}L${lx} ${Math.max(L.bottom - R.top - 11, y)}`;
          }
        });
        p = `M${rx} ${ry}L${tx} ${ry}M${tx} ${minY}L${tx} ${maxY}`;
      }
      if (!wide) { svg.innerHTML = ''; return; }
      svg.innerHTML = `<path class="tx__trunk" d="${p}"/><path class="tx__twig" d="${t}"/>` +
        (reduce() ? '' : `<path class="tx__pulse" d="${p}"/>`);
    }

    /* ---------- interactions ---------- */
    onClick(e) {
      const t = e.target.closest('button, [data-id]');
      if (!t || !this.el.contains(t)) return;
      if (t.classList.contains('tx__full')) return this.toggleFull();
      if (t.classList.contains('tx__more')) { requestAnimationFrame(() => this.drawArrows()); this.expanded = true; const ov = t.closest('.tx__overview, .tx__diagram'); ov.classList.remove('is-clamped'); ov.style.maxHeight = ''; t.hidden = true; return this.drawLinks(); }
      if (t.dataset.mode) { this.mode = t.dataset.mode; this.path = []; this.expanded = false; return this.render(false); }
      if (t.classList.contains('tx__dbox')) { this.path = [t.dataset.id]; return this.render(t.getBoundingClientRect()); }
      if (t.classList.contains('tx__dpart')) { const b = t.closest('.tx__dbox'); this.path = [b.dataset.id]; this.render(b.getBoundingClientRect()); const card = this.stage.querySelector(`.tx__card[data-id="${CSS.escape(t.dataset.id)}"]`); if (card) { card.classList.add('is-ping'); setTimeout(() => card.classList.remove('is-ping'), 1600); } return; }
      if (t.dataset.view) { this.view = t.dataset.view; this.path = []; return this.render(false); }
      if (t.dataset.flag) { this.filter = this.filter === t.dataset.flag ? null : t.dataset.flag; if (this.filter) this.expandAll(); this.updateChrome(); return this.applyFilter(); }
      if (t.dataset.go !== undefined) { this.path = this.path.slice(0, Number(t.dataset.go) + 1); return this.render('out'); }
      if (t.dataset.jump) { this.path = this.pathTo(t.dataset.jump); return this.render(t.getBoundingClientRect()); }
      if (t.dataset.open) { const rect = t.closest('.tx__card').getBoundingClientRect(); this.path.push(t.dataset.open); return this.render(rect); }
      if (t.classList.contains('tx__branch')) { this.path = [t.dataset.id]; return this.render(t.getBoundingClientRect()); }
      if (t.classList.contains('tx__leaf')) {
        const rect = t.getBoundingClientRect();
        const leaf = this.byId[t.dataset.id];
        this.path = this.kids(leaf).length ? [t.dataset.branch, t.dataset.id] : [t.dataset.branch];
        this.render(rect);
        const card = this.stage.querySelector(`.tx__card[data-id="${CSS.escape(t.dataset.id)}"]`);
        if (card) { card.classList.add('is-ping'); setTimeout(() => card.classList.remove('is-ping'), 1600); card.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' }); }
      }
    }

    pathTo(id) {
      const out = []; let n = this.byId[id];
      while (n && n !== this.data) { out.unshift(n.id); n = n._parent; }
      return out;
    }

    onHover(e, on) {
      const b = e.target.closest('.tx__branch, .tx__dbox');
      if (!b || !this.el.contains(b)) return;
      const id = b.dataset.id;
      const linked = new Set();
      (this.data.links || []).forEach(l => { if (l.from === id) linked.add(l.to); if (l.to === id) linked.add(l.from); });
      this.stage.querySelectorAll('.tx__branch, .tx__dbox').forEach(x => x.classList.toggle('is-linked', on && linked.has(x.dataset.id)));
      this.stage.querySelectorAll('.tx__arrow-g').forEach(g => g.classList.toggle('is-on', on && (g.dataset.from === id || g.dataset.to === id)));
    }

    applyFilter() {
      const f = FLAGS.find(x => x.id === this.filter);
      this.stage.querySelectorAll('[data-id]').forEach(el => {
        const n = this.byId[el.dataset.id];
        let hit = false;
        if (f) { walk(n, m => { if (this.visible(m) && f.match(m)) hit = true; }); }
        el.classList.toggle('is-hit', !!f && hit);
      });
    }

    zoomIn(wrap, from, out) {
      if (out === true || from === 'out') {
        wrap.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
        return;
      }
      const S = this.stage.getBoundingClientRect();
      const sx = Math.max(0.08, from.width / S.width), sy = Math.max(0.05, from.height / Math.max(1, wrap.offsetHeight));
      const dx = from.left - S.left, dy = from.top - S.top;
      wrap.style.transformOrigin = '0 0';
      wrap.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.15 },
        { transform: 'none', opacity: 1 },
      ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      if (this.el.getBoundingClientRect().top < 0) this.el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    toggleFull(force) {
      const on = force !== undefined ? force : !this.el.classList.contains('tx--full');
      this.el.classList.toggle('tx--full', on);
      document.documentElement.classList.toggle('tx-lock', on);
      const btn = this.el.querySelector('.tx__full');
      btn.setAttribute('aria-label', on ? 'Close full screen' : 'Open full screen');
      if (on) { this.el.setAttribute('tabindex', '-1'); this.el.focus({ preventScroll: true }); }
      requestAnimationFrame(() => { this.drawLinks(); this.drawArrows(); });
    }
  }

  function boot() {
    const els = document.querySelectorAll('[data-tree]');
    const start = el => { if (el._tx) return; el._tx = new Explorer(el); el._tx.load(); };
    if (!('IntersectionObserver' in window)) return els.forEach(start);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { start(e.target); io.unobserve(e.target); } }), { rootMargin: '600px 0px' });
    els.forEach(el => io.observe(el));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
