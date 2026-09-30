/* ============================================================
   UNA MANO SPENSIERATA — KARAOKE DEL PODCAST
   Sotto il lettore del podcast (colonna di sinistra; il box appunti
   resta dov'è, a destra) compare la trascrizione:
     - la parola pronunciata si illumina, anche se si torna indietro
       o si salta avanti con il lettore o con i tasti ±10s;
     - il testo scorre da solo; se lo scorri a mano si ferma e compare
       «Torna al punto dell'audio»;
     - toccando una parola si ascolta da lì;
     - si sottolinea come il riassuntone: selezione → «Sottolinea»,
       con il colore della palette, e finisce nella lavagna.
   Dati: campo "podcast_sottotitoli" del JSON della lezione (percorso
   di un file JSON sullo stesso sito, preparato dal server).
============================================================ */
(function () {
  'use strict';

  var file = null;
  try { file = new URLSearchParams(location.search).get('file'); } catch (e) {}
  if (!file) return;
  var CHIAVE = 'ums_karaoke::' + file;
  var AUDIO = /\.(mp3|m4a|wav|ogg|aac)(\?.*)?$/i;
  var RIDUCI = false;
  try { RIDUCI = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  fetch(file, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    var url = (d && d.podcast_url || '').trim();
    var rif = d && d.podcast_sottotitoli;
    if (!rif || !AUDIO.test(url)) return;
    // se il podcast è stato rifatto, i sottotitoli vecchi non valgono: il server li rifà
    if (d.podcast_sottotitoli_per && d.podcast_sottotitoli_per !== url) return;
    return fetch(rif, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (s) {
      if (!s || !Array.isArray(s.paragrafi) || !s.paragrafi.length) return;
      aspettaLettore(function (audio, wrap) { monta(audio, wrap, s); });
    });
  }).catch(function (err) { try { console.error('Karaoke podcast:', err); } catch (e) {} });

  // il lettore audio lo crea un altro script: lo aspetto
  function aspettaLettore(fatto) {
    var inizio = Date.now();
    (function prova() {
      var iframe = document.getElementById('dyn-podcast-player');
      var col = iframe && (iframe.closest('.video-container') || iframe.parentElement).parentElement;
      var wrap = col && col.querySelector('.ums-media-player');
      var audio = wrap && wrap.querySelector('audio');
      if (audio) return fatto(audio, wrap);
      if (Date.now() - inizio < 30000) setTimeout(prova, 300);
    })();
  }

  function el(tag, attrs, figli) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (figli || []).forEach(function (f) { if (f != null) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return n;
  }

  function stile() {
    if (document.getElementById('umk-stile')) return;
    var css = [
      '.umk{margin-top:16px;background:var(--ivory);border:1px solid var(--dust);border-radius:var(--r-lg);box-shadow:var(--shadow-card);overflow:hidden;position:relative}',
      '.umk-barra{background:#fff;padding:10px 12px;border-bottom:1px solid var(--dust);display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.night-mode .umk-barra{background:var(--ivory-dk)}',
      '.umk-titolo{font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--sub);margin-right:auto}',
      '.umk-btn{padding:7px 14px;font-size:.75rem;font-weight:600;cursor:pointer;border:1px solid var(--dust);background:var(--ivory);',
      'border-radius:50px;font-family:var(--font-body);letter-spacing:.04em;color:var(--body);transition:all .2s}',
      '.umk-btn:hover{border-color:var(--navy);color:var(--navy);background:#fff}',
      '.umk-btn[aria-pressed=true]{background:var(--navy);border-color:var(--navy);color:#fff}',
      '.night-mode .umk-btn[aria-pressed=true]{background:var(--gold);border-color:var(--gold);color:#1C1C22}',
      '.umk-btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px}',
      '.umk-testo{max-height:46vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 22px 10px;',
      'font-family:var(--font-body);font-size:var(--umk-fs,1.02rem);line-height:1.95;color:var(--body);scroll-behavior:auto}',
      '@media (max-width:900px){.umk-testo{max-height:52vh;padding:16px 16px 8px}}',
      '.umk-testo:focus-visible{outline:2px solid var(--gold);outline-offset:-2px}',
      '.umk-testo p{margin:0 0 14px;padding-left:12px;border-left:3px solid transparent;transition:border-color .3s}',
      '.umk-testo p.umk-ora{border-left-color:var(--gold)}',
      '.umk-w{border-radius:4px;cursor:pointer;transition:background-color .12s ease,color .12s ease}',
      '.umk-w:hover{text-decoration:underline;text-decoration-color:var(--gold-lt);text-underline-offset:4px}',
      '.umk-w.umk-fatta{color:var(--ink)}',
      '.umk-w.umk-voce{background:var(--gold-lt);color:var(--ink);box-shadow:0 0 0 2px var(--gold-lt)}',
      '.night-mode .umk-w.umk-voce{background:var(--gold);color:#1C1C22;box-shadow:0 0 0 2px var(--gold)}',
      '.umk-testo mark.highlighted-text .umk-w.umk-voce{box-shadow:0 0 0 2px var(--navy)}',
      '.umk-torna{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);display:none;z-index:3;',
      'padding:9px 16px;border-radius:999px;border:0;background:var(--navy);color:#fff;font:600 .8rem/1 var(--font-body);cursor:pointer;box-shadow:var(--shadow-card)}',
      '.umk-torna.umk-su{display:block}',
      '.umk-nota{margin:0;padding:8px 16px 12px;font-size:.78rem;color:var(--sub);line-height:1.5;border-top:1px solid var(--dust)}',
      '@media (prefers-reduced-motion:reduce){.umk-w,.umk-testo p{transition:none}}'
    ].join('');
    document.head.appendChild(el('style', { id: 'umk-stile', text: css }));
  }

  function monta(audio, wrap, dati) {
    if (document.querySelector('.umk')) return;
    stile();

    /* ---------------- il testo, una parola per volta ---------------- */
    var parole = [];                  // [{nodo, t0, t1, p}]
    var paragrafi = [];
    var testo = el('div', { class: 'umk-testo', tabindex: '0', role: 'document', 'aria-label': 'Trascrizione del podcast. Tocca una parola per ascoltare da quel punto.' });
    dati.paragrafi.forEach(function (par, ip) {
      var p = el('p', { 'data-p': String(ip) });
      par.forEach(function (w, k) {
        if (k) p.appendChild(document.createTextNode(' '));
        var s = el('span', { class: 'umk-w', 'data-i': String(parole.length), text: w[0] });
        p.appendChild(s);
        parole.push({ nodo: s, t0: +w[1], t1: +w[2], p: ip });
      });
      testo.appendChild(p);
      paragrafi.push(p);
    });
    if (!parole.length) return;

    /* ---------------- barra e contenitore ---------------- */
    var segui = true, ultimoScrollAMano = 0, dimensione = 1.02;
    var bSegui = el('button', { type: 'button', class: 'umk-btn', 'aria-pressed': 'true', text: 'Segui l\u2019audio' });
    var bMeno = el('button', { type: 'button', class: 'umk-btn', 'aria-label': 'Testo pi\u00f9 piccolo', text: 'A\u2212' });
    var bPiu = el('button', { type: 'button', class: 'umk-btn', 'aria-label': 'Testo pi\u00f9 grande', text: 'A+' });
    var barra = el('div', { class: 'umk-barra' }, [el('span', { class: 'umk-titolo', text: 'Trascrizione' }), bSegui, bMeno, bPiu]);
    var torna = el('button', { type: 'button', class: 'umk-torna', text: 'Torna al punto dell\u2019audio' });
    var nota = el('p', { class: 'umk-nota', text: 'Trascrizione automatica: qualche parola, soprattutto i nomi propri, pu\u00f2 essere imprecisa. Tocca una parola per ascoltare da l\u00ec; seleziona un pezzo per sottolinearlo.' });
    var box = el('section', { class: 'umk', 'aria-label': 'Trascrizione del podcast' }, [barra, testo, torna, nota]);
    wrap.insertAdjacentElement('afterend', box);

    var pref = leggi() || {};
    if (pref.fs) { dimensione = pref.fs; testo.style.setProperty('--umk-fs', dimensione + 'rem'); }
    if (pref.segui === false) { segui = false; bSegui.setAttribute('aria-pressed', 'false'); }
    function salvaPref() { var s = leggi() || {}; s.fs = dimensione; s.segui = segui; scrivi(s); }

    bSegui.addEventListener('click', function () {
      segui = !segui; bSegui.setAttribute('aria-pressed', segui ? 'true' : 'false');
      salvaPref(); if (segui) { ultimoScrollAMano = 0; centra(true); }
    });
    function cambiaDim(delta) {
      dimensione = Math.max(0.9, Math.min(1.5, Math.round((dimensione + delta) * 100) / 100));
      testo.style.setProperty('--umk-fs', dimensione + 'rem'); salvaPref(); centra(true);
    }
    bMeno.addEventListener('click', function () { cambiaDim(-0.08); });
    bPiu.addEventListener('click', function () { cambiaDim(0.08); });

    /* ---------------- sincronia con l'audio ---------------- */
    var attuale = -1, parAttuale = -1;
    function indiceA(t) {            // ultima parola iniziata prima di t
      var lo = 0, hi = parole.length - 1, r = -1;
      while (lo <= hi) { var m = (lo + hi) >> 1; if (parole[m].t0 <= t + 0.05) { r = m; lo = m + 1; } else hi = m - 1; }
      return r;
    }
    function aggiorna(forzaScroll) {
      var t = audio.currentTime || 0;
      var i = indiceA(t);
      if (i === attuale && !forzaScroll) return;
      // parole "già dette": solo nel paragrafo in corso, così tornare indietro si vede subito
      if (attuale >= 0) {
        parole[attuale].nodo.classList.remove('umk-voce');
      }
      var nuovoPar = i >= 0 ? parole[i].p : -1;
      if (nuovoPar !== parAttuale) {
        if (parAttuale >= 0) {
          paragrafi[parAttuale].classList.remove('umk-ora');
          paragrafi[parAttuale].querySelectorAll('.umk-fatta').forEach(function (n) { n.classList.remove('umk-fatta'); });
        }
        if (nuovoPar >= 0) paragrafi[nuovoPar].classList.add('umk-ora');
        parAttuale = nuovoPar;
      }
      if (i >= 0) {
        // nel paragrafo in corso: le parole prima della voce "fatte", quelle dopo no
        paragrafi[nuovoPar].querySelectorAll('.umk-w').forEach(function (n) {
          var k = +n.getAttribute('data-i');
          n.classList.toggle('umk-fatta', k < i);
        });
        parole[i].nodo.classList.add('umk-voce');
      }
      attuale = i;
      centra(forzaScroll);
    }
    function centra(forza) {
      if (attuale < 0) { torna.classList.remove('umk-su'); return; }
      var n = parole[attuale].nodo;
      var top = n.offsetTop - testo.offsetTop, alto = testo.clientHeight;
      var visibile = top > testo.scrollTop + alto * 0.12 && top < testo.scrollTop + alto * 0.72;
      var aMano = Date.now() - ultimoScrollAMano < 6000;
      if (segui && (!aMano || forza) && (!visibile || forza)) {
        scorri(Math.max(0, top - alto * 0.3));
        torna.classList.remove('umk-su');
      } else {
        torna.classList.toggle('umk-su', segui && !visibile && !audio.paused);
      }
    }
    var scorrendoDaSolo = false;
    function scorri(y) {
      scorrendoDaSolo = true;
      if (RIDUCI) testo.scrollTop = y; else testo.scrollTo({ top: y, behavior: 'smooth' });
      setTimeout(function () { scorrendoDaSolo = false; }, 700);
    }
    ['wheel', 'touchmove', 'keydown'].forEach(function (ev) {
      testo.addEventListener(ev, function () { ultimoScrollAMano = Date.now(); }, { passive: true });
    });
    testo.addEventListener('scroll', function () { if (!scorrendoDaSolo) { ultimoScrollAMano = Date.now(); centra(false); } }, { passive: true });
    torna.addEventListener('click', function () { ultimoScrollAMano = 0; centra(true); });

    var giro = null;
    function ciclo() { aggiorna(false); if (!audio.paused) giro = requestAnimationFrame(ciclo); }
    audio.addEventListener('play', function () { cancelAnimationFrame(giro); giro = requestAnimationFrame(ciclo); });
    audio.addEventListener('pause', function () { cancelAnimationFrame(giro); aggiorna(false); });
    // indietro/avanti con il lettore o con i tasti ±10s: si riallinea subito
    audio.addEventListener('seeking', function () { ultimoScrollAMano = 0; aggiorna(true); });
    audio.addEventListener('seeked', function () { aggiorna(true); });
    audio.addEventListener('timeupdate', function () { if (audio.paused) aggiorna(false); });

    // tocca una parola: si ascolta da lì (ma non se si sta selezionando per sottolineare)
    testo.addEventListener('click', function (e) {
      var w = e.target.closest && e.target.closest('.umk-w');
      if (!w) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) return;
      var p = parole[+w.getAttribute('data-i')];
      if (!p) return;
      ultimoScrollAMano = 0;
      audio.currentTime = Math.max(0, p.t0 - 0.05);
      aggiorna(true);
    });

    /* ---------------- sottolineatura (come nel riassuntone) ---------------- */
    function parolaDi(nodo, finale) {
      var n = nodo.nodeType === 3 ? nodo.parentElement : nodo;
      var w = n && n.closest && n.closest('.umk-w');
      if (w) return w;
      // la selezione può cominciare o finire su uno spazio tra due parole
      var s = nodo.nodeType === 3 ? nodo : null;
      var vicino = s ? (finale ? s.previousElementSibling || s.previousSibling : s.nextElementSibling || s.nextSibling) : null;
      while (vicino && !(vicino.classList && (vicino.classList.contains('umk-w') || vicino.tagName === 'MARK'))) vicino = finale ? vicino.previousSibling : vicino.nextSibling;
      if (vicino && vicino.tagName === 'MARK') vicino = finale ? vicino.querySelector('.umk-w:last-of-type') : vicino.querySelector('.umk-w');
      return vicino;
    }
    function coloreAttivo() {
      try { if (typeof hlActiveColor !== 'undefined' && hlActiveColor) return hlActiveColor; } catch (e) {}   // eslint-disable-line no-undef
      return '#FFF176';
    }
    function avviso(t) { try { if (typeof showToast === 'function') showToast(t, 'retry'); } catch (e) {} }   // eslint-disable-line no-undef
    function sottolinea(da, a, colore, id) {
      var s = parole[da].nodo, f = parole[a].nodo;
      if (s.parentNode !== f.parentNode) return null;     // dentro lo stesso paragrafo e fuori da altre sottolineature
      var mark = document.createElement('mark');
      mark.className = 'highlighted-text';
      mark.style.backgroundColor = colore;
      mark.setAttribute('data-hl-id', id);
      s.parentNode.insertBefore(mark, s);
      var n = s;
      while (n) { var dopo = n.nextSibling; mark.appendChild(n); if (n === f) break; n = dopo; }
      return mark;
    }
    document.addEventListener('click', function (e) {
      var bottone = e.target.closest && e.target.closest('#floating-highlighter .hl-add');
      if (!bottone) return;
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var r = sel.getRangeAt(0);
      if (!testo.contains(r.commonAncestorContainer)) return;          // fuori dal karaoke: ci pensa il sito come sempre
      e.stopPropagation(); e.preventDefault();
      var btn = document.getElementById('floating-highlighter');
      if (btn) btn.style.display = 'none';
      var ws = parolaDi(r.startContainer, false), wf = parolaDi(r.endContainer, true);
      if (!ws || !wf) { sel.removeAllRanges(); return; }
      var da = +ws.getAttribute('data-i'), a = +wf.getAttribute('data-i');
      if (a < da) { var x = da; da = a; a = x; }
      if (parole[da].p !== parole[a].p) { sel.removeAllRanges(); avviso('Sottolinea dentro lo stesso paragrafo.'); return; }
      var colore = coloreAttivo(), id = 'hl_' + Date.now();
      var m = sottolinea(da, a, colore, id);
      sel.removeAllRanges();
      if (!m) { avviso('Questo pezzo \u00e8 gi\u00e0 in parte sottolineato: rimuovi prima l\u2019altra sottolineatura.'); return; }
      try { if (typeof window.wbAddEntry === 'function') window.wbAddEntry(m.textContent.trim(), colore, id); } catch (err) {}
      salvaSottolineature();
    }, true);

    // le sottolineature del karaoke si salvano per lezione; se le togli
    // (dal pulsante «Rimuovi» o dalla lavagna) il salvataggio si aggiorna da solo
    function salvaSottolineature() {
      var lista = [];
      testo.querySelectorAll('mark.highlighted-text').forEach(function (m) {
        var w = m.querySelectorAll('.umk-w');
        if (!w.length) return;
        lista.push({ id: m.getAttribute('data-hl-id'), da: +w[0].getAttribute('data-i'), a: +w[w.length - 1].getAttribute('data-i'), c: m.style.backgroundColor });
      });
      var s = leggi() || {}; s.hl = lista; s.audio = (dati.audio || ''); scrivi(s);
    }
    var salvate = (pref.hl || []).slice().sort(function (x, y) { return x.da - y.da; });
    if (!pref.audio || pref.audio === (dati.audio || '')) {
      salvate.forEach(function (h) { if (parole[h.da] && parole[h.a]) sottolinea(h.da, h.a, h.c, h.id); });
    }
    var attesa = null;
    new MutationObserver(function () { clearTimeout(attesa); attesa = setTimeout(salvaSottolineature, 150); })
      .observe(testo, { childList: true, subtree: true });

    aggiorna(true);
    if (typeof window.riapriPannello === 'function') window.riapriPannello();
    var acc = box.closest('.accordion-content');
    if (acc && acc.classList.contains('active')) acc.style.maxHeight = acc.scrollHeight + 15000 + 'px';
  }

  function leggi() { try { return JSON.parse(localStorage.getItem(CHIAVE)); } catch (e) { return null; } }
  function scrivi(v) { try { localStorage.setItem(CHIAVE, JSON.stringify(v)); } catch (e) {} }
})();
