/* Martin Engler, propuesta de web, versión 3.
   Todo el movimiento ligado al scroll sale de un único bucle de animación
   que lee la posición en cada fotograma; Lenis (si carga) sólo suaviza el
   desplazamiento. Sin Lenis, o con "reducir movimiento", la web funciona
   igual, sólo que quieta. */

(function () {
  'use strict';

  window.ENGLER = true;

  const root = document.documentElement;
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  if (calm) root.classList.remove('motion');

  /* ---------- Desplazamiento suave ---------- */

  let lenis = null;

  function startLenis() {
    if (calm || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9 });
  }

  /* ---------- Titulares por palabras ---------- */

  function splitText() {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      let n = 0;
      const wrap = function (node) {
        const out = document.createDocumentFragment();
        node.childNodes.forEach(function (child) {
          if (child.nodeType === 3) {
            child.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
              const mask = document.createElement('span');
              mask.className = 'split-line';
              mask.style.display = 'inline-block';
              const inner = document.createElement('span');
              inner.textContent = part;
              mask.style.setProperty('--l', n++);
              mask.appendChild(inner);
              out.appendChild(mask);
            });
          } else if (child.nodeName === 'BR') {
            out.appendChild(child.cloneNode());
          } else {
            const mask = document.createElement('span');
            mask.className = 'split-line';
            mask.style.display = 'inline-block';
            mask.style.setProperty('--l', n++);
            const inner = document.createElement('span');
            inner.appendChild(child.cloneNode(true));
            mask.appendChild(inner);
            out.appendChild(mask);
          }
        });
        return out;
      };
      const frag = wrap(el);
      el.textContent = '';
      el.appendChild(frag);
    });
  }

  /* ---------- Aparición al entrar en pantalla ---------- */

  function watchReveals() {
    const items = document.querySelectorAll('[data-reveal], [data-reveal-img], [data-split]');
    if (!root.classList.contains('motion') || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Bucle de scroll ---------- */

  const scrubbers = [];

  function addWords() {
    document.querySelectorAll('[data-words]').forEach(function (el) {
      const words = Array.from(el.querySelectorAll('.w'));
      if (!words.length) return;
      let lit = -1;
      scrubbers.push(function (vh) {
        const r = el.getBoundingClientRect();
        const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.35), 0, 1);
        const upto = Math.round(p * words.length);
        if (upto === lit) return;
        lit = upto;
        words.forEach(function (w, i) { w.style.opacity = i < upto ? 1 : ''; });
      });
    });
  }

  function addParallax() {
    if (calm) return;
    document.querySelectorAll('[data-speed]').forEach(function (el) {
      const speed = parseFloat(el.dataset.speed) || 0;
      scrubbers.push(function (vh) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    });
  }

  function addHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;
    const arch = hero.querySelector('[data-arch]');
    const lines = hero.querySelectorAll('[data-hero-line]');
    const caption = hero.querySelector('[data-captions]');
    const tag = hero.querySelector('.hero__tag');

    /* Pase lento de obras dentro del arco, con su pie sincronizado. */
    const slides = hero.querySelectorAll('.arch__slide');
    const caps = caption ? caption.children : [];
    let i = 0;
    if (!calm && slides.length > 1) {
      setInterval(function () {
        if (document.hidden) return;
        slides[i].classList.remove('is-on');
        if (caps[i]) caps[i].classList.remove('is-on');
        i = (i + 1) % slides.length;
        const img = slides[i].querySelector('img');
        if (img) img.loading = 'eager';
        slides[i].classList.add('is-on');
        if (caps[i]) caps[i].classList.add('is-on');
      }, 6500);
    }
    if (calm) return;

    /* Al bajar, el arco se abre hasta ocupar la pantalla y el nombre se
       separa hacia los lados. */
    const base = { w: arch.offsetWidth, h: arch.offsetHeight };
    window.addEventListener('resize', function () {
      arch.style.width = arch.style.height = arch.style.borderRadius = '';
      base.w = arch.offsetWidth;
      base.h = arch.offsetHeight;
    });
    scrubbers.push(function (vh, vw) {
      const r = hero.getBoundingClientRect();
      const span = hero.offsetHeight - vh;
      const p = clamp(-r.top / span, 0, 1);
      const e = 1 - Math.pow(1 - p, 2);
      arch.style.width = lerp(base.w, vw, e).toFixed(1) + 'px';
      arch.style.height = lerp(base.h, vh, e).toFixed(1) + 'px';
      const radius = lerp(base.w / 2, 0, e);
      arch.style.borderRadius = radius.toFixed(1) + 'px ' + radius.toFixed(1) + 'px 0 0';
      if (lines[0]) lines[0].style.transform = 'translate3d(' + (-e * 38).toFixed(2) + 'vw,0,0)';
      if (lines[1]) lines[1].style.transform = 'translate3d(' + (e * 38).toFixed(2) + 'vw,0,0)';
      const fade = clamp(1 - p * 1.6, 0, 1);
      lines.forEach((l) => { l.style.opacity = fade; });
      if (caption) caption.style.opacity = clamp(1 - p * 3, 0, 1);
      if (tag) tag.style.opacity = clamp(1 - p * 3, 0, 1);
    });
  }

  function addHorizontal() {
    const section = document.querySelector('[data-hz]');
    if (!section) return;
    const track = section.querySelector('[data-hz-track]');
    let distance = 0;
    const measure = function () {
      const wide = window.innerWidth >= 900 && !calm;
      section.classList.toggle('no-pin', !wide);
      if (!wide) {
        section.style.height = '';
        track.style.transform = '';
        distance = 0;
        return;
      }
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = (window.innerHeight + distance * 1.15) + 'px';
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    scrubbers.push(function (vh) {
      if (!distance) return;
      const r = section.getBoundingClientRect();
      const p = clamp(-r.top / (section.offsetHeight - vh), 0, 1);
      track.style.transform = 'translate3d(' + (-p * distance).toFixed(1) + 'px,0,0)';
    });
  }

  function addBar() {
    const bar = document.querySelector('[data-bar]');
    if (!bar) return;
    let last = 0;
    scrubbers.push(function () {
      const y = window.scrollY;
      if (root.classList.contains('menu-open')) return;
      bar.classList.toggle('is-solid', y > 40);
      if (Math.abs(y - last) < 6) return;
      bar.classList.toggle('is-hidden', y > last && y > 160);
      last = y;
    });
  }

  function loop(time) {
    if (lenis) lenis.raf(time);
    const vh = window.innerHeight;
    const vw = document.documentElement.clientWidth;
    for (let k = 0; k < scrubbers.length; k++) scrubbers[k](vh, vw);
    requestAnimationFrame(loop);
  }

  /* ---------- Contadores ---------- */

  function watchCounts() {
    const items = document.querySelectorAll('[data-count]');
    if (!items.length) return;
    const run = function (el) {
      const target = parseInt(el.dataset.count, 10);
      if (calm) { el.textContent = target; return; }
      const start = performance.now();
      const dur = 2600;
      const tick = function (now) {
        const p = clamp((now - start) / dur, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Cursor, imán e imagen flotante ---------- */

  const mouse = { x: -200, y: -200 };

  function wireCursor() {
    if (!finePointer || calm) return;
    const cursor = document.querySelector('.cursor');
    if (!cursor) return;
    root.classList.add('has-cursor');
    // El punto va pegado al ratón: con inercia parecía que la web se atascaba.
    // Lo lento es solo el cambio de tamaño (CSS).
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
    const types = ['is-view', 'is-zoom', 'is-play'];
    document.addEventListener('mouseover', function (e) {
      const target = e.target.closest('[data-cursor]');
      cursor.classList.remove('is-big', ...types);
      if (target) cursor.classList.add('is-big', 'is-' + target.dataset.cursor);
    });
  }

  function wireMagnetic() {
    if (!finePointer || calm) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.style.transition = (el.style.transition ? el.style.transition + ', ' : '') + 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)';
      el.addEventListener('mousemove', function (e) {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.18;
        const dy = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  function wireFloater() {
    const box = document.querySelector('[data-floater]');
    if (!box || !finePointer) return;
    const img = box.querySelector('img');
    const pos = { x: 0, y: 0 };
    let on = false;
    document.querySelectorAll('[data-float]').forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        if (img.getAttribute('src') !== row.dataset.float) {
          img.style.opacity = 0;
          const next = new Image();
          next.onload = function () { img.src = row.dataset.float; img.style.opacity = 1; };
          next.src = row.dataset.float;
        }
        box.classList.add('is-on');
        on = true;
      });
      row.addEventListener('mouseleave', function () { box.classList.remove('is-on'); on = false; });
    });
    scrubbers.push(function () {
      if (!on && !box.classList.contains('is-on')) return;
      pos.x = lerp(pos.x, mouse.x - box.offsetWidth / 2, 0.07);
      pos.y = lerp(pos.y, mouse.y - box.offsetHeight / 2, 0.07);
      box.style.left = pos.x.toFixed(1) + 'px';
      box.style.top = pos.y.toFixed(1) + 'px';
    });
  }

  /* ---------- Menú ---------- */

  function wireMenu() {
    const button = document.querySelector('[data-burger]');
    const menu = document.querySelector('[data-menu]');
    if (!button || !menu) return;
    menu.hidden = false;
    menu.querySelectorAll('.menu__item').forEach(function (item, i) {
      item.style.setProperty('--i', i);
      if (item.querySelector('.menu__link[aria-current]')) item.classList.add('is-current');
    });

    const shots = menu.querySelectorAll('[data-shot]');
    const current = menu.querySelector('.menu__link[aria-current]');
    const fallback = current ? current.closest('[data-preview]').dataset.preview : 'mono';
    const show = function (key) {
      shots.forEach((s) => s.classList.toggle('is-on', s.dataset.shot === key));
    };
    show(fallback);
    menu.querySelectorAll('[data-preview]').forEach(function (el) {
      const key = el.dataset.preview;
      const enter = function (e) { e.stopPropagation(); show(key); };
      el.addEventListener('mouseenter', enter);
      el.addEventListener('focusin', enter);
    });
    menu.querySelector('.menu__list').addEventListener('mouseleave', () => show(fallback));

    const set = function (open) {
      button.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      document.body.classList.toggle('is-locked', open);
      menu.setAttribute('aria-hidden', String(!open));
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open) {
        document.querySelector('[data-bar]').classList.remove('is-hidden');
        setTimeout(function () {
          const first = menu.querySelector('.menu__link');
          if (first) first.focus({ preventScroll: true });
        }, 700);
      }
    };
    menu.setAttribute('aria-hidden', 'true');
    button.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        set(false);
        button.focus();
      }
    });
  }

  /* ---------- Entrada con el logo (una vez por visita) ---------- */

  function runIntro(done) {
    const intro = document.querySelector('[data-intro]');
    let seen = false;
    try { seen = sessionStorage.getItem('engler-intro') === '1'; } catch (e) {}
    if (!intro || seen || calm) { done(); return; }
    try { sessionStorage.setItem('engler-intro', '1'); } catch (e) {}
    root.classList.add('intro-play');
    if (lenis) lenis.stop();
    setTimeout(() => intro.classList.add('is-logo'), 150);
    setTimeout(function () { intro.classList.add('is-out'); done(); }, 2300);
    setTimeout(function () {
      root.classList.remove('intro-play');
      if (lenis) lenis.start();
    }, 4200);
  }

  /* ---------- Columnas de obras en orden ---------- */

  function wireFlow() {
    document.querySelectorAll('[data-flow]').forEach(function (list) {
      const items = Array.from(list.children);
      items.forEach((item, i) => { item.dataset.order = String(i); });
      let current = 0;
      const layout = function () {
        const w = window.innerWidth;
        const count = w >= 1200 ? 3 : w >= 700 ? 2 : 1;
        if (count === current) return;
        current = count;
        const cols = [];
        const heights = new Array(count).fill(0);
        for (let i = 0; i < count; i++) {
          const col = document.createElement('div');
          col.className = 'flow__col';
          cols.push(col);
        }
        items.forEach(function (item) {
          const img = item.querySelector('img');
          const ratio = img && img.width ? img.height / img.width : 1;
          const target = heights.indexOf(Math.min.apply(null, heights));
          cols[target].appendChild(item);
          heights[target] += ratio + 0.35;
        });
        list.replaceChildren.apply(list, cols);
        list.classList.add('is-split');
      };
      layout();
      window.addEventListener('resize', layout);
    });
  }

  /* ---------- Visor ---------- */

  function wireViewer() {
    const links = document.querySelectorAll('[data-view], [data-video]');
    if (!links.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'viewer';
    dialog.innerHTML =
      '<div class="viewer__bar"><span class="viewer__count" data-count-slot></span>' +
      '<button class="viewer__btn" type="button" data-close aria-label="Close">&times;</button></div>' +
      '<div class="viewer__stage" data-stage>' +
      '<button class="viewer__btn viewer__prev" type="button" data-prev aria-label="Prev">&#10094;</button>' +
      '<button class="viewer__btn viewer__next" type="button" data-next aria-label="Next">&#10095;</button></div>' +
      '<div class="viewer__caption" data-caption-slot></div>';
    document.body.appendChild(dialog);
    const stage = dialog.querySelector('[data-stage]');
    const caption = dialog.querySelector('[data-caption-slot]');
    const count = dialog.querySelector('[data-count-slot]');
    const prev = dialog.querySelector('[data-prev]');
    const next = dialog.querySelector('[data-next]');
    let list = [];
    let index = 0;
    let opener = null;

    const captionFor = function (link) {
      const item = link.closest('[data-item]');
      const src = item && item.querySelector('[data-caption]');
      if (!src) return '';
      const clone = src.cloneNode(true);
      clone.querySelectorAll('[data-view]').forEach((a) => a.remove());
      return clone.innerHTML;
    };

    const show = function (i) {
      index = (i + list.length) % list.length;
      const link = list[index];
      stage.querySelectorAll('img, iframe').forEach((el) => el.remove());
      if (link.dataset.video) {
        const frame = document.createElement('iframe');
        frame.src = 'https://www.youtube-nocookie.com/embed/' + link.dataset.video + '?autoplay=1&rel=0';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.title = (link.closest('.film') || link).textContent.trim();
        stage.prepend(frame);
        caption.innerHTML = '';
      } else {
        const img = document.createElement('img');
        img.src = link.getAttribute('href');
        const thumb = link.querySelector('img');
        img.alt = thumb ? thumb.alt : '';
        stage.prepend(img);
        caption.innerHTML = captionFor(link);
      }
      const many = list.length > 1;
      prev.hidden = next.hidden = !many;
      count.textContent = many ? String(index + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0') : '';
    };

    const open = function (link) {
      const group = link.closest('[data-gallery]');
      const sel = link.dataset.video ? '[data-video]' : '[data-view]';
      list = Array.from((group || document).querySelectorAll(sel));
      if (!group || link.dataset.video) list = [link];  // un vídeo o una obra se ven solos
      opener = link;
      show(list.indexOf(link));
      dialog.showModal();
      document.body.classList.add('is-locked');
      if (lenis) lenis.stop();
    };

    dialog.addEventListener('close', function () {
      stage.querySelectorAll('img, iframe').forEach((el) => el.remove());
      document.body.classList.remove('is-locked');
      if (lenis) lenis.start();
      if (opener) opener.focus({ preventScroll: true });
    });
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        open(link);
      });
    });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));
    dialog.addEventListener('click', (e) => { if (e.target === stage) dialog.close(); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    let startX = null;
    stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (startX === null || list.length < 2) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Ficha: flechas del teclado ---------- */

  function wirePager() {
    const links = document.querySelectorAll('.pager__link');
    if (links.length !== 2) return;
    document.addEventListener('keydown', function (e) {
      if (document.querySelector('dialog[open]') || root.classList.contains('menu-open')) return;
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowLeft') location.href = links[0].href;
      if (e.key === 'ArrowRight') location.href = links[1].href;
    });
  }

  /* ---------- Formulario ---------- */

  function wireForm() {
    const form = document.querySelector('[data-form]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const body = data.get('mensaje') + '\n\n' + data.get('nombre') + '\n' + data.get('email');
      location.href = 'mailto:' + form.dataset.mailto + '?subject=' + encodeURIComponent(data.get('asunto')) +
        '&body=' + encodeURIComponent(body);
    });
  }

  /* ---------- Arranque ---------- */

  function start() {
    startLenis();
    splitText();
    wireFlow();
    wireMenu();
    wireViewer();
    wirePager();
    wireForm();
    wireCursor();
    wireMagnetic();
    wireFloater();
    addBar();
    addWords();
    addParallax();
    addHorizontal();
    addHero();
    watchCounts();
    requestAnimationFrame(loop);
    runIntro(function () {
      const hero = document.querySelector('[data-hero]');
      if (hero) setTimeout(() => hero.classList.add('is-in'), 200);
      watchReveals();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
