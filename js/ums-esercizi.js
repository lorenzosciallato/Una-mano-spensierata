/* ============================================================
   UNA MANO SPENSIERATA — ESERCIZI D'ESAME
   Compare nella lezione SOLO se il JSON ha "esercizi.trovati".
   Il server (ums_esercizi.py) trova gli esercizi della prova scritta
   nella lezione; qui si generano le VARIANTI (sempre diverse) e si
   corregge "con la matita rossa e blu": blu quello che va, rosso
   quello che non va, con il perché.
   SOLO DISEGNI VETTORIALI: niente immagini generate, perché negli
   esercizi il disegno deve corrispondere esattamente ai numeri.
   Tipi:
     reticolo_coordinate  — latitudine/longitudine su un reticolo
     densita_popolamento  — area, densità, distribuzione sparsa/accentrata
     altro                — varianti preparate da NotebookLM (scorta), solo se
                            l'esercizio non ha bisogno di un disegno;
                            con "da_costruire" si mostra la spiegazione
                            in attesa del suo generatore vettoriale
============================================================ */
(function () {
  'use strict';

  var file = null;
  try { file = new URLSearchParams(location.search).get('file'); } catch (e) {}
  if (!file) return;

  fetch(file).then(function (r) { return r.json(); }).then(function (d) {
    var b = d && d.esercizi;
    var lista = (b && Array.isArray(b.trovati) ? b.trovati : []).filter(function (e) {
      if (!e || !e.tipo) return false;
      if (e.tipo === 'altro') return e.da_costruire || (Array.isArray(e.banca) && e.banca.length > 0);
      return e.tipo === 'reticolo_coordinate' || e.tipo === 'densita_popolamento';
    });
    if (!lista.length) return;
    monta(lista);
  }).catch(function (err) { try { console.error('Esercizi d\u2019esame:', err); } catch (e) {} });

  /* ---------------- utilità ---------------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, figli) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (figli || []).forEach(function (f) { if (f) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return n;
  }
  function sv(tag, attrs, testo) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (testo != null) n.textContent = testo;
    return n;
  }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pesca(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function mescola(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function numero(v) {
    if (v == null) return NaN;
    var s = String(v).trim().replace(',', '.');
    if (s === '') return NaN;
    return Number(s);
  }
  function fmtNum(x) {
    return (Math.round(x * 100) / 100).toString().replace('.', ',');
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------------- statistiche (per lezione, nel browser) ---------------- */
  var CHIAVE = 'ums_esercizi::' + file;
  function stats() { try { return JSON.parse(localStorage.getItem(CHIAVE)) || {}; } catch (e) { return {}; } }
  function segna(id, preso) {
    var s = stats(); var x = s[id] || { fatte: 0, prese: 0 };
    x.fatte++; if (preso) x.prese++;
    s[id] = x;
    try { localStorage.setItem(CHIAVE, JSON.stringify(s)); } catch (e) {}
    return x;
  }
  function testoStats(id) {
    var x = stats()[id];
    if (!x || !x.fatte) return 'Nessuna variante svolta finora.';
    return 'Varianti svolte: ' + x.fatte + ' — punto preso ' + x.prese + (x.prese === 1 ? ' volta' : ' volte') + '.';
  }

  /* ---------------- stile ---------------- */
  function stile() {
    if (document.getElementById('esx-stile')) return;
    var css = [
      '#esx-root{--esx-carta:#F2E8D3;--esx-carta2:#E7D8B8;--esx-inchiostro:#352A1F;--esx-seppia:#8B6E4B;',
      '--esx-rosso:#B3261E;--esx-blu:#2350A0;font-family:var(--font-body);color:var(--body)}',
      '.esx-scelta{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 22px}',
      '.esx-scelta button{font:600 .9rem/1.2 var(--font-body);padding:10px 16px;border-radius:999px;cursor:pointer;',
      'border:1px solid var(--gold-lt);background:transparent;color:var(--ink);text-align:left}',
      '.esx-scelta button[aria-pressed=true]{background:var(--navy);border-color:var(--navy);color:#fff}',
      '.esx-scelta small{display:block;font-weight:400;opacity:.75;font-size:.78rem;margin-top:2px}',
      '.esx-titolo{font:700 1.45rem/1.25 var(--font-display);color:var(--ink);margin:0 0 4px}',
      '.esx-valore{font-size:.9rem;color:var(--sub);margin:0 0 12px}',
      '.esx-consegna{max-width:68ch;line-height:1.65;margin:0 0 18px}',
      '.esx-banco{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:22px;align-items:start}',
      '@media (min-width:821px){.esx-banco .esx-tavola{position:sticky;top:calc(var(--topbar-h,62px) + 16px)}}',
      '@media (max-width:820px){.esx-banco{grid-template-columns:1fr}}',
      '.esx-tavola{background:var(--esx-carta);border-radius:10px;padding:10px;',
      'box-shadow:inset 0 0 0 1px rgba(139,110,75,.35),inset 0 0 60px rgba(139,110,75,.18)}',
      '.esx-tavola svg{display:block;width:100%;height:auto}',
      '.esx-tavola svg text{font-family:var(--font-display)}.esx-tavola svg text:not([fill]){fill:var(--esx-inchiostro)}',
      '.esx-foglio{background:#fff;border:1px solid var(--dust);border-radius:10px;padding:18px}',
      '.night-mode .esx-foglio{background:var(--ivory-dk)}',
      '.esx-foglio h4{font:700 1.05rem/1.3 var(--font-display);color:var(--ink);margin:0 0 12px}',
      '.esx-riga{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 14px}',
      '.esx-riga > span.esx-lab{min-width:100px;font-weight:600;color:var(--ink);font-size:.95rem}',
      '@media (max-width:600px){.esx-riga > span.esx-lab{flex-basis:100%}}',
      '.esx-campo{width:4.2em;font:600 1.15rem/1 var(--font-display);text-align:center;padding:8px 4px;',
      'border:0;border-bottom:2px solid var(--esx-seppia);background:transparent;color:var(--ink);border-radius:0}',
      '.esx-campo:focus{outline:2px solid var(--gold);outline-offset:2px}',
      '.esx-campo.largo{width:6em}',
      '.esx-seg{display:inline-flex;border:1px solid var(--esx-seppia);border-radius:999px;overflow:hidden}',
      '.esx-seg button{font:600 .9rem/1 var(--font-body);padding:8px 12px;border:0;background:transparent;color:var(--ink);cursor:pointer}',
      '.esx-seg button[aria-pressed=true]{background:var(--esx-seppia);color:#fff}',
      '.esx-seg button:focus-visible{outline:2px solid var(--gold);outline-offset:-2px}',
      '.esx-unita{font:italic 1.1rem var(--font-display);color:var(--esx-seppia)}',
      '.esx-azioni{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}',
      '.esx-btn{font:600 .95rem/1 var(--font-body);padding:12px 18px;border-radius:999px;cursor:pointer;border:1px solid var(--navy);',
      'background:var(--navy);color:#fff}',
      '.esx-btn.sec{background:transparent;color:var(--ink);border-color:var(--gold-lt)}',
      '.esx-btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px}',
      '.esx-btn[disabled]{opacity:.45;cursor:not-allowed}',
      '.esx-corr{margin-top:22px;border-left:3px solid var(--esx-seppia);padding:4px 0 4px 16px}',
      '.esx-esito{font:700 1.3rem/1.3 var(--font-display);margin:0 0 10px}',
      '.esx-esito.preso{color:var(--esx-blu)}.esx-esito.perso{color:var(--esx-rosso)}',
      '.night-mode .esx-esito.preso{color:#8FB4E8}.night-mode .esx-esito.perso{color:#EF9A9A}',
      '.esx-err{color:var(--esx-rosso);margin:0 0 8px;line-height:1.55}',
      '.esx-ok{color:var(--esx-blu);margin:0 0 8px;line-height:1.55}',
      '.night-mode .esx-err{color:#EF9A9A}.night-mode .esx-ok{color:#8FB4E8}',
      '.esx-passi{margin:10px 0 0;padding-left:1.3em;line-height:1.65;max-width:70ch}',
      '.esx-passi li{margin-bottom:6px}',
      '.esx-conti{font-size:.88rem;color:var(--sub);margin-top:12px}',
      '.esx-docente{margin-top:26px;border-top:1px solid var(--dust);padding-top:14px}',
      '.esx-docente summary{cursor:pointer;font:700 1rem var(--font-display);color:var(--ink)}',
      '.esx-docente h5{font:600 .95rem var(--font-body);color:var(--ink);margin:14px 0 4px}',
      '.esx-docente ul{margin:0;padding-left:1.2em;line-height:1.6;max-width:70ch}',
      '.esx-step{border-top:1px dashed rgba(139,110,75,.45);padding-top:14px;margin-top:14px}',
      '.esx-step:first-of-type{border-top:0;padding-top:0;margin-top:0}',
      '.esx-step p.q{margin:0 0 10px;font-weight:600;color:var(--ink);line-height:1.45}',
      '.esx-step .esx-mini{margin:8px 0 0;font-size:.95rem;line-height:1.5}',
      '.esx-opz{display:grid;gap:8px;margin:0 0 10px}',
      '.esx-opz label{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border:1px solid var(--dust);',
      'border-radius:10px;cursor:pointer;line-height:1.4}',
      '.esx-opz label.giusta{border-color:var(--esx-blu);box-shadow:inset 3px 0 0 var(--esx-blu)}',
      '.esx-opz label.sbagliata{border-color:var(--esx-rosso);box-shadow:inset 3px 0 0 var(--esx-rosso)}',
                              '.esx-disegno{opacity:0;transition:opacity .6s ease}',
      '.esx-disegno.on{opacity:1}',
      '@media (prefers-reduced-motion:reduce){.esx-disegno{transition:none}}',
      '.esx-etic-trappola{cursor:pointer}',
      '.esx-etic-trappola:focus{outline:none}',
      '.esx-etic-trappola:focus rect,.esx-etic-trappola:hover rect{stroke:var(--gold);stroke-width:2}'
    ].join('');
    document.head.appendChild(el('style', { id: 'esx-stile', text: css }));
  }

  /* ---------------- montaggio ---------------- */
  function monta(lista) {
    var acc = document.getElementById('acc-esercizi');
    var root = document.getElementById('esx-root');
    if (!acc || !root) return;
    stile();
    acc.style.display = '';
    var n = document.getElementById('esx-conteggio');
    if (n) n.textContent = lista.length === 1 ? 'Un esercizio della prova scritta' : lista.length + ' esercizi della prova scritta';

    var palco = el('div');
    if (lista.length > 1) {
      var scelta = el('div', { class: 'esx-scelta', role: 'group', 'aria-label': 'Scegli l\u2019esercizio' });
      lista.forEach(function (e, i) {
        var b = el('button', { type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false' },
          [e.titolo || ('Esercizio ' + (i + 1)), e.punti_esame ? el('small', { text: 'Vale ' + e.punti_esame }) : null]);
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(scelta.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          apri(e);
        });
        scelta.appendChild(b);
      });
      root.appendChild(scelta);
    }
    root.appendChild(palco);
    function apri(e) {
      palco.innerHTML = '';
      palco.appendChild(esercizio(e));
      riapriPannello();
    }
    apri(lista[0]);
  }

  // il pannello della fisarmonica ha un'altezza massima calcolata all'apertura
  function riapriPannello() {
    var p = document.querySelector('#acc-esercizi .accordion-content.active');
    if (p) p.style.maxHeight = p.scrollHeight + 15000 + 'px';
  }

  function esercizio(e) {
    var box = el('div', { class: 'esx-ex' });
    box.appendChild(el('h3', { class: 'esx-titolo', text: e.titolo || 'Esercizio' }));
    if (e.punti_esame) box.appendChild(el('p', { class: 'esx-valore', text: 'All\u2019esame vale ' + e.punti_esame + '.' }));
    if (e.consegna) box.appendChild(el('p', { class: 'esx-consegna', text: e.consegna }));
    var area = el('div');
    box.appendChild(area);
    var motore = e.tipo === 'reticolo_coordinate' ? Reticolo
               : e.tipo === 'densita_popolamento' ? Densita
               : e.da_costruire ? InArrivo : Banca;
    motore(area, e);
    var dc = docente(e); if (dc) box.appendChild(dc);
    return box;
  }

  function docente(e) {
    var blocchi = [];
    function lista(tit, arr) {
      if (!arr || !arr.length) return;
      blocchi.push(el('h5', { text: tit }));
      blocchi.push(el('ul', null, arr.map(function (t) { return el('li', { text: t }); })));
    }
    lista('Il metodo', e.procedimento);
    lista('I consigli del docente', e.consigli_docente);
    lista('Gli errori che vede ogni anno', e.errori_comuni);
    if (e.esempio_lezione) { blocchi.push(el('h5', { text: 'L\u2019esempio svolto in aula' })); blocchi.push(el('p', { text: e.esempio_lezione })); }
    if (e.cause_discusse && e.cause_discusse.length) lista('Le cause discusse in aula', e.cause_discusse);
    if (!blocchi.length) return null;
    var d = el('details', { class: 'esx-docente' }, [el('summary', { text: 'Come lo spiega il docente' })].concat(blocchi));
    d.addEventListener('toggle', riapriPannello);
    return d;
  }

  function segmentato(opzioni, etichetta) {
    var box = el('div', { class: 'esx-seg', role: 'group', 'aria-label': etichetta });
    var valore = null;
    opzioni.forEach(function (o) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false', text: o.t });
      b.addEventListener('click', function () {
        valore = o.v;
        Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      box.appendChild(b);
    });
    box.valore = function () { return valore; };
    return box;
  }

  /* =====================================================================
     1. COORDINATE SUL RETICOLO
     ===================================================================== */
  // Città reali, coordinate arrotondate ai 5 primi (come si legge a occhio).
  var CITTA = [
    ['Hanoi', 21, 0, 'N', 105, 50, 'E'], ['Hong Kong', 22, 15, 'N', 114, 10, 'E'],
    ['Roma', 41, 55, 'N', 12, 30, 'E'], ['Macerata', 43, 20, 'N', 13, 25, 'E'],
    ['Madrid', 40, 25, 'N', 3, 40, 'O'], ['New York', 40, 45, 'N', 74, 0, 'O'],
    ['Buenos Aires', 34, 35, 'S', 58, 25, 'O'], ['Sydney', 33, 50, 'S', 151, 10, 'E'],
    ['Citt\u00e0 del Capo', 33, 55, 'S', 18, 25, 'E'], ['Tokyo', 35, 40, 'N', 139, 40, 'E'],
    ['Il Cairo', 30, 5, 'N', 31, 15, 'E'], ['Rio de Janeiro', 22, 55, 'S', 43, 10, 'O'],
    ['Citt\u00e0 del Messico', 19, 25, 'N', 99, 10, 'O'], ['Mumbai', 19, 5, 'N', 72, 55, 'E'],
    ['Lima', 12, 5, 'S', 77, 5, 'O'], ['Mosca', 55, 45, 'N', 37, 35, 'E'],
    ['Pechino', 39, 55, 'N', 116, 25, 'E'], ['Bangkok', 13, 45, 'N', 100, 30, 'E'],
    ['Santiago del Cile', 33, 25, 'S', 70, 40, 'O'], ['Los Angeles', 34, 5, 'N', 118, 15, 'O'],
    ['Atene', 38, 0, 'N', 23, 45, 'E'], ['Reykjav\u00edk', 64, 10, 'N', 21, 55, 'O'],
    ['Perth', 31, 55, 'S', 115, 50, 'E'], ['Honolulu', 21, 20, 'N', 157, 50, 'O'],
    ['Parigi', 48, 50, 'N', 2, 20, 'E'], ['Lisbona', 38, 45, 'N', 9, 10, 'O'],
    ['Nuova Delhi', 28, 35, 'N', 77, 10, 'E'], ['Toronto', 43, 40, 'N', 79, 25, 'O']
  ];
  var FRAZ = { 0: 'sulla linea', 5: 'appena oltre la linea', 10: 'a un sesto', 15: 'a un quarto',
    20: 'a un terzo', 25: 'poco prima della met\u00e0', 30: 'a met\u00e0', 35: 'poco oltre la met\u00e0',
    40: 'a due terzi', 45: 'a tre quarti', 50: 'a cinque sesti', 55: 'quasi alla linea successiva' };

  function Reticolo(area, e) {
    var ultimaCitta = null;
    var STRETTO = window.innerWidth < 600;           // sul telefono un reticolo pi\u00f9 compatto e scritte pi\u00f9 grandi
    var COLS = STRETTO ? 3 : 4, ROWS = 3, CELL = 110, SX = 80, SY = 46, FS = STRETTO ? 21 : 17;
    var W = SX + COLS * CELL + 24, H = SY + ROWS * CELL + 58;

    function variante() {
      var v = {};
      if (Math.random() < 0.6) {
        var c; do { c = pesca(CITTA); } while (c[0] === ultimaCitta && CITTA.length > 1);
        ultimaCitta = c[0];
        v.nome = c[0]; v.latG = c[1]; v.latM = c[2]; v.ns = c[3]; v.lonG = c[4]; v.lonM = c[5]; v.eo = c[6];
      } else {
        var PRIMI = [0, 10, 15, 20, 30, 40, 45, 50];
        v.nome = 'P'; v.ns = Math.random() < 0.7 ? 'N' : 'S'; v.eo = Math.random() < 0.55 ? 'E' : 'O';
        v.latG = rnd(4, 66); v.lonG = rnd(4, 172); v.latM = pesca(PRIMI); v.lonM = pesca(PRIMI);
      }
      // reticolo attorno al punto, senza attraversare equatore o meridiano 0/180
      var r = rnd(0, ROWS - 1), c2 = rnd(0, COLS - 1);
      v.a0 = Math.max(1, v.latG - r); if (v.a0 + ROWS > 89) v.a0 = 89 - ROWS;
      v.b0 = Math.max(1, v.lonG - c2); if (v.b0 + COLS > 179) v.b0 = 179 - COLS;
      v.labLat = v.a0 + rnd(0, ROWS);
      v.labLon = v.b0 + rnd(0, COLS);
      // trappola: un'etichetta sbagliata, come quella del libro vista in aula
      v.trappola = null;
      if (Math.random() < 0.25) {
        var altre = []; for (var k = v.b0; k <= v.b0 + COLS; k++) if (Math.abs(k - v.labLon) >= 2) altre.push(k);
        var vera = pesca(altre), s = String(vera).split('').reverse().join('');
        var falsa = Number(s);
        if (falsa === vera || s[0] === '0' || falsa > 180) falsa = vera + (Math.random() < 0.5 ? 10 : -10);
        v.trappola = { vera: vera, falsa: falsa, trovata: false };
      }
      return v;
    }

    function yLat(v, abs) { return v.ns === 'N' ? SY + (v.a0 + ROWS - abs) * CELL : SY + (abs - v.a0) * CELL; }
    function xLon(v, abs) { return v.eo === 'E' ? SX + (abs - v.b0) * CELL : SX + (v.b0 + COLS - abs) * CELL; }

    var v, svg, fAns = {}, corr, btnCorreggi, fatto = false;

    function disegna() {
      svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
      var descr = 'Reticolo di ' + (ROWS + 1) + ' paralleli e ' + (COLS + 1) + ' meridiani a distanza di 1 grado. ' +
        'Parallelo etichettato: ' + v.labLat + '\u00b0 ' + v.ns + '. Meridiano etichettato: ' + v.labLon + '\u00b0 ' + v.eo + '. ' +
        'Il punto ' + v.nome + ' \u00e8 segnato nel reticolo.';
      svg.setAttribute('aria-label', descr);
      var defs = sv('defs');
      var filt = sv('filter', { id: 'esx-grana', x: '0', y: '0', width: '100%', height: '100%' });
      filt.appendChild(sv('feTurbulence', { type: 'fractalNoise', baseFrequency: '.9', numOctaves: '2', result: 'n' }));
      filt.appendChild(sv('feColorMatrix', { type: 'matrix', values: '0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .2  0 0 0 .07 0' }));
      defs.appendChild(filt); svg.appendChild(defs);
      svg.appendChild(sv('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#esx-grana)' }));
      // riquadri
      var gx0 = SX, gy0 = SY, gx1 = SX + COLS * CELL, gy1 = SY + ROWS * CELL;
      svg.appendChild(sv('rect', { x: gx0 - 6, y: gy0 - 6, width: gx1 - gx0 + 12, height: gy1 - gy0 + 12,
        fill: 'none', stroke: '#8B6E4B', 'stroke-width': 1 }));
      for (var i = 0; i <= ROWS; i++) {
        var y = SY + i * CELL;
        svg.appendChild(sv('line', { x1: gx0, y1: y, x2: gx1, y2: y, stroke: '#5C4A36', 'stroke-width': i === 0 || i === ROWS ? 1.6 : 1.1 }));
      }
      for (var j = 0; j <= COLS; j++) {
        var x = SX + j * CELL;
        svg.appendChild(sv('line', { x1: x, y1: gy0, x2: x, y2: gy1, stroke: '#5C4A36', 'stroke-width': j === 0 || j === COLS ? 1.6 : 1.1 }));
      }
      // etichette date
      svg.appendChild(sv('text', { x: SX - 12, y: yLat(v, v.labLat) + 5, 'text-anchor': 'end', 'font-size': FS, 'font-style': 'italic' },
        v.labLat + '\u00b0 ' + v.ns));
      svg.appendChild(sv('text', { x: xLon(v, v.labLon), y: gy1 + 30, 'text-anchor': 'middle', 'font-size': FS, 'font-style': 'italic' },
        v.labLon + '\u00b0 ' + v.eo));
      if (v.trappola) {
        var t = v.trappola;
        var g = sv('g', { class: 'esx-etic-trappola', tabindex: '0', role: 'button',
          'aria-label': 'Etichetta ' + t.falsa + ' gradi ' + v.eo + ': segnala come sbagliata' });
        var tx = xLon(v, t.vera);
        g.appendChild(sv('rect', { x: tx - 34, y: gy1 + 12, width: 68, height: 26, rx: 5, fill: 'transparent', stroke: 'transparent' }));
        g.appendChild(sv('text', { x: tx, y: gy1 + 30, 'text-anchor': 'middle', 'font-size': FS, 'font-style': 'italic' }, t.falsa + '\u00b0 ' + v.eo));
        function scova() {
          if (t.trovata) return;
          t.trovata = true;
          g.appendChild(sv('line', { x1: tx - 30, y1: gy1 + 24, x2: tx + 30, y2: gy1 + 24, stroke: '#B3261E', 'stroke-width': 2.2 }));
          g.appendChild(sv('text', { x: tx, y: gy1 + 52, 'text-anchor': 'middle', 'font-size': 15, fill: '#2350A0', 'font-style': 'italic' }, t.vera + '\u00b0'));
          trappolaMsg.className = 'esx-ok';
          trappolaMsg.textContent = 'Esatto: in quella posizione il valore giusto \u00e8 ' + t.vera + '\u00b0 ' + v.eo +
            '. Le etichette seguono la sequenza di un grado per linea: quella stampata non poteva stare l\u00ec.';
        }
        g.addEventListener('click', scova);
        g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); scova(); } });
        svg.appendChild(g);
      }
      // rosa dei venti minima: solo la N, per ricordare che il nord \u00e8 in alto
      var nx = SX + COLS * CELL - 4;
      svg.appendChild(sv('path', { d: 'M ' + nx + ' ' + (SY - 34) + ' l -6 16 l 6 -4 l 6 4 z', fill: '#5C4A36' }));
      svg.appendChild(sv('text', { x: nx - 14, y: SY - 20, 'text-anchor': 'end', 'font-size': 13, 'font-style': 'italic' }, 'nord'));
      // punto
      var px = xLon(v, v.lonG + v.lonM / 60), py = yLat(v, v.latG + v.latM / 60);
      svg.appendChild(sv('circle', { cx: px, cy: py, r: 9, fill: 'none', stroke: '#352A1F', 'stroke-width': 1.2 }));
      svg.appendChild(sv('circle', { cx: px, cy: py, r: 4, fill: '#352A1F' }));
      var dx = px > SX + COLS * CELL - 110 ? -14 : 14;
      var ny = py - 12 < SY + 16 ? py + 24 : py - 12;      // vicino al bordo alto: il nome va sotto
      var nome = sv('text', { x: px + dx, y: ny, 'text-anchor': dx < 0 ? 'end' : 'start', 'font-size': FS - 1, 'font-weight': 700,
        stroke: '#F2E8D3', 'stroke-width': 4, 'paint-order': 'stroke' }, v.nome);
      svg.appendChild(nome);
      return svg;
    }

    var trappolaMsg = el('p', { class: 'esx-mini' });

    function foglio() {
      var f = el('div', { class: 'esx-foglio' });
      f.appendChild(el('h4', { text: v.nome === 'P' ? 'Scrivi le coordinate del punto P' : 'Scrivi le coordinate di ' + v.nome }));
      if (v.trappola) {
        f.appendChild(el('p', { class: 'esx-mini', text: 'Attenzione: una delle etichette dei meridiani \u00e8 stampata male, come nel libro visto in aula. Toccala sul reticolo prima di iniziare.' }));
        f.appendChild(trappolaMsg);
      }
      function riga(lab, chiave, dirOpz) {
        fAns[chiave + 'G'] = el('input', { class: 'esx-campo', inputmode: 'numeric', 'aria-label': lab + ', gradi', autocomplete: 'off' });
        fAns[chiave + 'M'] = el('input', { class: 'esx-campo', inputmode: 'numeric', 'aria-label': lab + ', primi', autocomplete: 'off' });
        fAns[chiave + 'D'] = segmentato(dirOpz, lab + ', direzione');
        return el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: lab }),
          fAns[chiave + 'G'], el('span', { class: 'esx-unita', text: '\u00b0' }),
          fAns[chiave + 'M'], el('span', { class: 'esx-unita', text: '\u2032' }), fAns[chiave + 'D']]);
      }
      f.appendChild(riga('Latitudine', 'lat', [{ t: 'Nord', v: 'N' }, { t: 'Sud', v: 'S' }]));
      f.appendChild(riga('Longitudine', 'lon', [{ t: 'Est', v: 'E' }, { t: 'Ovest', v: 'O' }]));
      btnCorreggi = el('button', { type: 'button', class: 'esx-btn', text: 'Correggi' });
      btnCorreggi.addEventListener('click', correggi);
      var nuova = el('button', { type: 'button', class: 'esx-btn sec', text: 'Nuova variante' });
      nuova.addEventListener('click', function () { if (fatto || confirm('Passare a una nuova variante senza correggere questa?')) nuovaVariante(); });
      f.appendChild(el('div', { class: 'esx-azioni' }, [btnCorreggi, nuova]));
      return f;
    }

    function correggi() {
      if (fatto) return;
      var u = {
        latG: numero(fAns.latG.value), latM: fAns.latM.value.trim(), ns: fAns.latD.valore(),
        lonG: numero(fAns.lonG.value), lonM: fAns.lonM.value.trim(), eo: fAns.lonD.valore()
      };
      if (isNaN(u.latG) && isNaN(u.lonG)) { fAns.latG.focus(); return; }
      fatto = true; btnCorreggi.disabled = true;
      var errori = [], ok = [];
      var latMn = numero(u.latM), lonMn = numero(u.lonM);
      // scambio latitudine/longitudine
      if (u.latG === v.lonG && u.lonG === v.latG && v.latG !== v.lonG) {
        errori.push('Hai scambiato latitudine e longitudine: la latitudine si legge sui paralleli (le linee orizzontali), la longitudine sui meridiani (le verticali).');
      }
      function controlla(nome, gU, mU, mUn, dU, gV, mV, dV, testoDir) {
        var tutto = true;
        if (dU !== dV) { tutto = false; errori.push(nome + ': la direzione \u00e8 ' + testoDir(dV) + '. ' + perDir(nome, dV)); }
        if (gU !== gV) {
          tutto = false;
          if (Math.abs(gU - gV) === 1) errori.push(nome + ': i gradi sono ' + gV + ', non ' + gU + '. Il punto sta tra due linee: il grado \u00e8 quello della linea con il valore pi\u00f9 basso, poi si aggiungono i primi.');
          else if (!isNaN(gU)) errori.push(nome + ': i gradi sono ' + gV + '. Parti dall\u2019etichetta e scrivi il valore di tutte le linee, una per una: cos\u00ec non sbagli il verso in cui crescono.');
          else errori.push(nome + ': mancano i gradi.');
        }
        if (mU === '') { tutto = false; errori.push(nome + ': mancano i primi. Vanno scritti sempre, anche quando sono zero (per esempio ' + gV + '\u00b000\u2032): senza, indichi un\u2019area e non un punto.'); }
        else if (mUn >= 60) { tutto = false; errori.push(nome + ': i primi vanno da 0 a 59. Come sull\u2019orologio, un grado si divide in 60 primi.'); }
        else if (!isNaN(mUn) && gU === gV && Math.abs(mUn - mV) > 5) { tutto = false; errori.push(nome + ': la stima dei primi \u00e8 lontana. Il punto sta ' + FRAZ[mV] + ' del riquadro, cio\u00e8 ' + pad2(mV) + '\u2032.'); }
        if (tutto) ok.push(nome + ': ' + gV + '\u00b0' + pad2(mV) + '\u2032 ' + dV + (mUn !== mV ? ' (hai scritto ' + pad2(mUn) + '\u2032: stima accettata, l\u2019errore di lettura a occhio \u00e8 di 5\u2032)' : '') + '.');
        return tutto;
      }
      function perDir(nome, d) {
        if (nome === 'Latitudine') return d === 'N' ? 'I valori crescono verso l\u2019alto: siamo a nord dell\u2019equatore.' : 'I valori crescono verso il basso: siamo a sud dell\u2019equatore.';
        return d === 'E' ? 'I valori crescono verso destra: siamo a est del meridiano di Greenwich.' : 'I valori crescono verso sinistra: siamo a ovest del meridiano di Greenwich.';
      }
      var a = controlla('Latitudine', u.latG, u.latM, latMn, u.ns, v.latG, v.latM, v.ns, function (d) { return d === 'N' ? 'nord' : 'sud'; });
      var b = controlla('Longitudine', u.lonG, u.lonM, lonMn, u.eo, v.lonG, v.lonM, v.eo, function (d) { return d === 'E' ? 'est' : 'ovest'; });
      var preso = a && b && (!v.trappola || v.trappola.trovata);
      if (v.trappola && !v.trappola.trovata) errori.push('Non hai segnalato l\u2019etichetta sbagliata: ' + v.trappola.falsa + '\u00b0 era al posto di ' + v.trappola.vera + '\u00b0. Controlla sempre che le etichette seguano la sequenza.');
      correzioneSulReticolo();
      var st = segna(e.id || 'reticolo', preso);
      corr.innerHTML = '';
      corr.appendChild(el('p', { class: 'esx-esito ' + (preso ? 'preso' : 'perso'), text: preso ? 'Punto preso.' : 'Punto perso.' }));
      ok.forEach(function (t) { corr.appendChild(el('p', { class: 'esx-ok', text: t })); });
      errori.forEach(function (t) { corr.appendChild(el('p', { class: 'esx-err', text: t })); });
      var basso = v.latG;   // il grado \u00e8 sempre quello della linea con il valore pi\u00f9 basso
      corr.appendChild(el('ol', { class: 'esx-passi' }, [
        el('li', { text: 'Scrivi il valore di tutte le linee partendo dalle etichette date: sul reticolo li trovi ora in blu.' }),
        el('li', { text: 'Il punto sta tra i paralleli ' + basso + '\u00b0 e ' + (basso + 1) + '\u00b0 ' + v.ns + ': la latitudine parte da ' + basso + '\u00b0. Dentro il riquadro \u00e8 ' + FRAZ[v.latM] + ', quindi ' + pad2(v.latM) + '\u2032.' }),
        el('li', { text: 'Tra i meridiani ' + v.lonG + '\u00b0 e ' + (v.lonG + 1) + '\u00b0 ' + v.eo + ': la longitudine parte da ' + v.lonG + '\u00b0 ed \u00e8 ' + FRAZ[v.lonM] + ' del riquadro, quindi ' + pad2(v.lonM) + '\u2032.' }),
        el('li', { text: 'Risultato: ' + v.latG + '\u00b0' + pad2(v.latM) + '\u2032 ' + v.ns + ', ' + v.lonG + '\u00b0' + pad2(v.lonM) + '\u2032 ' + v.eo + '.' })
      ]));
      if (v.nome !== 'P') corr.appendChild(el('p', { class: 'esx-mini', text: 'Sono le coordinate reali di ' + v.nome + ', arrotondate ai 5 primi.' }));
      corr.appendChild(el('p', { class: 'esx-conti', text: testoStats(e.id || 'reticolo') }));
      riapriPannello();
    }

    // la correzione disegnata sul reticolo, a matita blu
    function correzioneSulReticolo() {
      var g = sv('g', { class: 'esx-disegno' });
      var BLU = '#2350A0';
      for (var i = 0; i <= ROWS; i++) {
        var val = v.a0 + i;
        if (val === v.labLat) continue;
        g.appendChild(sv('text', { x: SX - 12, y: yLat(v, val) + 5, 'text-anchor': 'end', 'font-size': FS - 2, fill: BLU, 'font-style': 'italic' }, val + '\u00b0'));
      }
      for (var j = 0; j <= COLS; j++) {
        var vl = v.b0 + j;
        if (vl === v.labLon) continue;
        if (v.trappola && vl === v.trappola.vera) {
          if (!v.trappola.trovata) {       // non segnalata: la correggo io
            var tx2 = xLon(v, vl), yb2 = SY + ROWS * CELL;
            g.appendChild(sv('line', { x1: tx2 - 30, y1: yb2 + 24, x2: tx2 + 30, y2: yb2 + 24, stroke: '#B3261E', 'stroke-width': 2.2 }));
            g.appendChild(sv('text', { x: tx2, y: yb2 + 52, 'text-anchor': 'middle', 'font-size': FS - 2, fill: BLU, 'font-style': 'italic' }, vl + '\u00b0'));
          }
          continue;
        }
        g.appendChild(sv('text', { x: xLon(v, vl), y: SY + ROWS * CELL + 30, 'text-anchor': 'middle', 'font-size': FS - 2, fill: BLU, 'font-style': 'italic' }, vl + '\u00b0'));
      }
      var px = xLon(v, v.lonG + v.lonM / 60), py = yLat(v, v.latG + v.latM / 60);
      // riquadro del punto, diviso in quarti
      var xa = xLon(v, v.lonG), xb = xLon(v, v.lonG + 1), ya = yLat(v, v.latG), yb = yLat(v, v.latG + 1);
      var x0 = Math.min(xa, xb), y0 = Math.min(ya, yb);
      g.appendChild(sv('rect', { x: x0, y: y0, width: CELL, height: CELL, fill: 'rgba(35,80,160,.07)', stroke: BLU, 'stroke-width': 1.4 }));
      [0.25, 0.5, 0.75].forEach(function (q) {
        g.appendChild(sv('line', { x1: x0 + q * CELL, y1: y0, x2: x0 + q * CELL, y2: y0 + CELL, stroke: BLU, 'stroke-width': .8, 'stroke-dasharray': '3 4', opacity: .6 }));
        g.appendChild(sv('line', { x1: x0, y1: y0 + q * CELL, x2: x0 + CELL, y2: y0 + q * CELL, stroke: BLU, 'stroke-width': .8, 'stroke-dasharray': '3 4', opacity: .6 }));
      });
      // i due tratti che "misurano" i primi: dal punto alla linea del suo grado
      var yG = yLat(v, v.latG), xG = xLon(v, v.lonG);
      g.appendChild(sv('line', { x1: px, y1: py, x2: px, y2: yG, stroke: BLU, 'stroke-width': 1.6 }));
      g.appendChild(sv('line', { x1: px, y1: py, x2: xG, y2: py, stroke: BLU, 'stroke-width': 1.6 }));
      if (v.latM) g.appendChild(sv('text', { x: px + 6, y: (py + yG) / 2 + 5, 'font-size': FS - 4, fill: BLU, 'font-style': 'italic' }, pad2(v.latM) + '\u2032'));
      if (v.lonM) g.appendChild(sv('text', { x: (px + xG) / 2, y: py + 17, 'text-anchor': 'middle', 'font-size': FS - 4, fill: BLU, 'font-style': 'italic' }, pad2(v.lonM) + '\u2032'));
      svg.appendChild(g);
      requestAnimationFrame(function () { requestAnimationFrame(function () { g.classList.add('on'); }); });
    }

    function nuovaVariante() {
      v = variante(); fatto = false; fAns = {};
      area.innerHTML = '';
      trappolaMsg = el('p', { class: 'esx-mini' });
      var tav = el('div', { class: 'esx-tavola' }, [disegna()]);
      corr = el('div', { class: 'esx-corr', 'aria-live': 'polite' });
      corr.appendChild(el('p', { class: 'esx-conti', text: testoStats(e.id || 'reticolo') }));
      area.appendChild(el('div', { class: 'esx-banco' }, [tav, foglio()]));
      area.appendChild(corr);
      riapriPannello();
    }
    nuovaVariante();
  }

  /* =====================================================================
     2. DENSITÀ E DISTRIBUZIONE DEL POPOLAMENTO
     ===================================================================== */
  var CAUSE = {
    accentrata: {
      giuste: ['L\u2019acqua c\u2019\u00e8 solo in un punto, un pozzo o una sorgente: si vive vicino a quella.',
               'Stare vicini, dentro le mura o attorno al castello, d\u00e0 sicurezza.',
               'La terra fertile o la strada ci sono solo in una parte del territorio.'],
      domanda: function (q) { return 'Perch\u00e9 nel quadrato ' + q + ' gli abitanti vivono tutti vicini? Scegli le ipotesi sensate.'; }
    },
    sparsa: {
      giuste: ['L\u2019acqua si trova un po\u2019 dappertutto.',
               'I terreni sono fertili su tutto il territorio.',
               'Le strade raggiungono ogni casa.',
               'Il territorio \u00e8 sicuro: si pu\u00f2 vivere isolati senza temere aggressori.'],
      domanda: function (q) { return 'Che cosa permette agli abitanti del quadrato ' + q + ' di vivere sparsi? Scegli le ipotesi sensate.'; }
    },
    sbagliate: ['\u00c8 casuale: gli abitanti si sono sistemati a caso.',
                'Nel quadrato accentrato la densit\u00e0 \u00e8 pi\u00f9 alta.',
                'Nel quadrato sparso abitano pi\u00f9 persone.',
                'Il quadrato accentrato \u00e8 pi\u00f9 piccolo.']
  };

  function Densita(area, e) {
    function variante() {
      var coppie = [];
      [[1, 6, 12], [2, 2, 7], [3, 2, 3]].forEach(function (x) { for (var d = x[1]; d <= x[2]; d++) coppie.push([x[0], d]); });
      var c = pesca(coppie), L = c[0], d = c[1], N = d * L * L;
      var v = { L: L, d: d, N: N, meta: Math.random() < 0.4, pozzo: Math.random() < 0.5 };
      v.sparsaA = Math.random() < 0.5;       // quale dei due quadrati è quello sparso
      v.focus = Math.random() < 0.5 ? 'accentrata' : 'sparsa';
      v.pSparsa = puntiSparsi(N);
      var cc = v.meta ? [0.3, 0.3] : [0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4];
      v.centro = cc;
      v.pAccentrata = puntiAccentrati(N, cc, v.meta);
      return v;
    }
    function lontano(p, lista, min) { return lista.every(function (q) { var dx = p[0] - q[0], dy = p[1] - q[1]; return dx * dx + dy * dy >= min * min; }); }
    function puntiSparsi(N) {
      var k = Math.ceil(Math.sqrt(N)), celle = [];
      for (var i = 0; i < k; i++) for (var j = 0; j < k; j++) celle.push([i, j]);
      return mescola(celle).slice(0, N).map(function (c) {
        return [(c[0] + 0.5 + (Math.random() - 0.5) * 0.55) / k, (c[1] + 0.5 + (Math.random() - 0.5) * 0.55) / k];
      });
    }
    function puntiAccentrati(N, c, meta) {
      var out = [], giri = 0, sigma = 0.07 + N * 0.0022;
      while (out.length < N && giri < 20000) {
        giri++;
        var u = Math.random() || 1e-9, w = Math.random();
        var r = sigma * Math.sqrt(-2 * Math.log(u)), a = 2 * Math.PI * w;
        var p = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
        if (p[0] < 0.05 || p[0] > 0.95 || p[1] < 0.05 || p[1] > 0.95) continue;
        if (meta && p[0] + p[1] > 0.92) continue;        // metà quadrato (sopra la diagonale) vuota
        if (!lontano(p, out, 0.045)) continue;
        out.push(p);
      }
      return out;
    }

    var v, passi, esitoBox, primoTentativo;

    function quadrato(nomeQ, punti, conPozzo) {
      var S = 220, M = 26, W = S + M * 2, H = S + M * 2 + 34;
      var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
        'aria-label': 'Quadrato ' + nomeQ + ' di lato ' + v.L + ' chilometri con ' + punti.length + ' punti, ciascuno un abitante.' });
      svg.appendChild(sv('rect', { x: M, y: M, width: S, height: S, fill: 'rgba(255,255,255,.35)', stroke: '#352A1F', 'stroke-width': 1.6 }));
      for (var i = 1; i < v.L; i++) {
        svg.appendChild(sv('line', { x1: M + i * S / v.L, y1: M, x2: M + i * S / v.L, y2: M + S, stroke: '#8B6E4B', 'stroke-width': .7, 'stroke-dasharray': '2 5' }));
        svg.appendChild(sv('line', { x1: M, y1: M + i * S / v.L, x2: M + S, y2: M + i * S / v.L, stroke: '#8B6E4B', 'stroke-width': .7, 'stroke-dasharray': '2 5' }));
      }
      if (v.meta && punti === v.pAccentrata) {   // la diagonale oltre la quale non abita nessuno
        svg.appendChild(sv('line', { x1: M + S, y1: M, x2: M, y2: M + S, stroke: '#8B6E4B', 'stroke-width': 1, 'stroke-dasharray': '6 5' }));
      }
      if (conPozzo) {
        var cx = M + v.centro[0] * S, cy = M + v.centro[1] * S;
        svg.appendChild(sv('circle', { cx: cx, cy: cy, r: 7, fill: 'none', stroke: '#2B5E8C', 'stroke-width': 1.6 }));
        svg.appendChild(sv('circle', { cx: cx, cy: cy, r: 2.5, fill: '#2B5E8C' }));
      }
      punti.forEach(function (p) {
        svg.appendChild(sv('circle', { cx: M + p[0] * S, cy: M + p[1] * S, r: 3.6, fill: '#352A1F' }));
      });
      svg.appendChild(sv('text', { x: M, y: 18, 'font-size': 18, 'font-weight': 700 }, nomeQ));
      // lato
      var yb = M + S + 16;
      svg.appendChild(sv('line', { x1: M, y1: yb, x2: M + S, y2: yb, stroke: '#352A1F', 'stroke-width': 1 }));
      svg.appendChild(sv('line', { x1: M, y1: yb - 5, x2: M, y2: yb + 5, stroke: '#352A1F' }));
      svg.appendChild(sv('line', { x1: M + S, y1: yb - 5, x2: M + S, y2: yb + 5, stroke: '#352A1F' }));
      svg.appendChild(sv('text', { x: M + S / 2, y: yb + 20, 'text-anchor': 'middle', 'font-size': 15, 'font-style': 'italic' }, 'lato ' + v.L + ' km'));
      return svg;
    }

    function campoNum(etichetta, unita) {
      var i = el('input', { class: 'esx-campo largo', inputmode: 'decimal', 'aria-label': etichetta, autocomplete: 'off' });
      return { input: i, riga: el('div', { class: 'esx-riga' }, [i, unita ? el('span', { class: 'esx-unita', text: unita }) : null]) };
    }

    function passo(domanda, costruisci, verifica) {
      var box = el('div', { class: 'esx-step' });
      box.appendChild(el('p', { class: 'q', text: domanda }));
      var ctrl = costruisci(box);
      var esito = el('div', { class: 'esx-mini', 'aria-live': 'polite' });
      var b = el('button', { type: 'button', class: 'esx-btn', text: 'Controlla' });
      b.addEventListener('click', function () {
        var r = verifica(ctrl);
        if (r === null) return;                       // campo vuoto
        b.disabled = true;
        esito.innerHTML = '';
        esito.appendChild(el('p', { class: r.ok ? 'esx-ok' : 'esx-err', text: r.testo }));
        if (r.extra) esito.appendChild(r.extra);
        if (!r.ok) primoTentativo[r.chiave || domanda] = false;
        box.querySelectorAll('input,button').forEach(function (x) { if (x !== b) x.disabled = true; });
        avanti();
      });
      box.appendChild(el('div', { class: 'esx-azioni' }, [b]));
      box.appendChild(esito);
      return box;
    }

    var coda = [];
    function avanti() {
      var p = coda.shift();
      if (p) { passi.appendChild(p()); var f = passi.lastChild.querySelector('input,button'); if (f) f.focus({ preventScroll: true }); }
      else chiudi();
      riapriPannello();
    }

    function nomi() {
      return v.sparsaA ? { sparsa: 'A', accentrata: 'B' } : { sparsa: 'B', accentrata: 'A' };
    }

    function costruisciPassi() {
      var n = nomi(), L = v.L, N = v.N, d = v.d, A2 = L * L;
      coda = [];
      coda.push(function () {
        return passo('Ogni punto \u00e8 un abitante. Quanti abitanti ci sono nel quadrato A?', function (box) {
          var c = campoNum('Abitanti nel quadrato A', 'abitanti'); box.appendChild(c.riga); return c.input;
        }, function (i) {
          var x = numero(i.value); if (isNaN(x)) { i.focus(); return null; }
          return x === N ? { ok: true, testo: 'Giusto: ' + N + ' abitanti.' }
            : { ok: false, chiave: 'conta', testo: 'Sono ' + N + '. Conta a gruppi, riga per riga: all\u2019esame i numeri sono piccoli apposta.' };
        });
      });
      coda.push(function () {
        return passo('Qual \u00e8 l\u2019area di ciascun quadrato?', function (box) {
          var c = campoNum('Area del quadrato in chilometri quadrati', 'km\u00b2'); box.appendChild(c.riga); return c.input;
        }, function (i) {
          var x = numero(i.value); if (isNaN(x)) { i.focus(); return null; }
          if (x === A2) return { ok: true, testo: 'Giusto: lato per lato, ' + L + ' \u00d7 ' + L + ' = ' + A2 + ' km\u00b2.' };
          var t = x === 4 * L ? 'Hai calcolato il perimetro (' + L + ' + ' + L + ' + ' + L + ' + ' + L + '). L\u2019area del quadrato \u00e8 lato per lato: ' + L + ' \u00d7 ' + L + ' = ' + A2 + ' km\u00b2.'
                : x === 2 * L ? 'Hai sommato due lati. L\u2019area \u00e8 lato per lato: ' + L + ' \u00d7 ' + L + ' = ' + A2 + ' km\u00b2.'
                : x === L && L > 1 ? 'Questo \u00e8 il lato. L\u2019area \u00e8 lato per lato: ' + A2 + ' km\u00b2.'
                : 'L\u2019area del quadrato \u00e8 lato per lato: ' + L + ' \u00d7 ' + L + ' = ' + A2 + ' km\u00b2.';
          return { ok: false, chiave: 'area', testo: t };
        });
      });
      function densita(q, chiave) {
        return function () {
          return passo('Qual \u00e8 la densit\u00e0 media del quadrato ' + q + '?', function (box) {
            var c = campoNum('Densit\u00e0 del quadrato ' + q, 'ab/km\u00b2'); box.appendChild(c.riga); return c.input;
          }, function (i) {
            var x = numero(i.value); if (isNaN(x)) { i.focus(); return null; }
            if (Math.abs(x - d) < 0.01) {
              var t = q === 'A' ? 'Giusto: ' + N + ' abitanti diviso ' + A2 + ' km\u00b2 = ' + d + ' ab/km\u00b2.'
                : 'Giusto: anche qui ' + d + ' ab/km\u00b2. Stessa densit\u00e0 media, eppure i due quadrati sono molto diversi: guarda come sono distribuiti.';
              return { ok: true, testo: t };
            }
            var t2 = Math.abs(x - A2 / N) < 0.01 ? 'Hai messo l\u2019area sopra. Nei tassi e negli indici il soggetto va al numeratore: gli abitanti. ' + N + ' / ' + A2 + ' = ' + d + ' ab/km\u00b2.'
              : Math.abs(x - N / (4 * L)) < 0.01 ? 'Hai diviso per il perimetro. Si divide per l\u2019area: ' + N + ' / ' + A2 + ' = ' + d + ' ab/km\u00b2.'
              : Math.abs(x - N / L) < 0.01 && L > 1 ? 'Hai diviso per il lato. Si divide per l\u2019area: ' + N + ' / ' + A2 + ' = ' + d + ' ab/km\u00b2.'
              : x === N && A2 > 1 ? 'Hai scritto il numero di abitanti. La densit\u00e0 \u00e8 abitanti diviso area: ' + N + ' / ' + A2 + ' = ' + d + ' ab/km\u00b2.'
              : q === 'B' ? 'Anche B ha ' + N + ' abitanti sulla stessa area: ' + N + ' / ' + A2 + ' = ' + d + ' ab/km\u00b2, come A.'
              : 'Densit\u00e0 = abitanti / area = ' + N + ' / ' + A2 + ' = ' + d + ' ab/km\u00b2.';
            return { ok: false, chiave: chiave, testo: t2 };
          });
        };
      }
      coda.push(densita('A', 'densA'));
      coda.push(densita('B', 'densB'));
      coda.push(function () {
        return passo('La densit\u00e0 \u00e8 la stessa. Com\u2019\u00e8 distribuita la popolazione in ciascun quadrato?', function (box) {
          var sa = segmentato([{ t: 'Sparsa', v: 'sparsa' }, { t: 'Accentrata', v: 'accentrata' }], 'Quadrato A');
          var sb = segmentato([{ t: 'Sparsa', v: 'sparsa' }, { t: 'Accentrata', v: 'accentrata' }], 'Quadrato B');
          box.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'Quadrato A' }), sa]));
          box.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'Quadrato B' }), sb]));
          return [sa, sb];
        }, function (c) {
          var a = c[0].valore(), b = c[1].valore(); if (!a || !b) return null;
          var ok = a === (v.sparsaA ? 'sparsa' : 'accentrata') && b === (v.sparsaA ? 'accentrata' : 'sparsa');
          return ok ? { ok: true, testo: 'Giusto: ' + n.sparsa + ' \u00e8 sparsa, ' + n.accentrata + ' \u00e8 accentrata. La densit\u00e0 media da sola non racconta come vive la gente sul territorio.' }
                    : { ok: false, chiave: 'distr', testo: n.sparsa + ' \u00e8 sparsa: case distribuite su tutto il territorio. ' + n.accentrata + ' \u00e8 accentrata: tutti raccolti in una parte. La densit\u00e0 \u00e8 uguale, la distribuzione no.' };
        });
      });
      coda.push(function () {
        var tipo = v.focus, q = n[tipo];
        var giuste = mescola(CAUSE[tipo].giuste).slice(0, 3);
        var sbagliate = mescola(CAUSE.sbagliate).slice(0, 3);
        var opz = mescola(giuste.map(function (t) { return { t: t, g: true }; }).concat(sbagliate.map(function (t) { return { t: t, g: false }; })));
        return passo(CAUSE[tipo].domanda(q), function (box) {
          var cont = el('div', { class: 'esx-opz' });
          opz.forEach(function (o) {
            var cb = el('input', { type: 'checkbox' });
            var lab = el('label', null, [cb, el('span', { text: o.t })]);
            o.cb = cb; o.lab = lab; cont.appendChild(lab);
          });
          box.appendChild(cont);
          return opz;
        }, function (o) {
          if (!o.some(function (x) { return x.cb.checked; })) return null;
          var tutto = true, casuale = false;
          o.forEach(function (x) {
            if (x.g) x.lab.classList.add('giusta');
            if (x.cb.checked !== x.g) { tutto = false; if (!x.g) x.lab.classList.add('sbagliata'); }
            if (!x.g && x.cb.checked && /casuale/i.test(x.t)) casuale = true;
          });
          var t = tutto ? 'Giusto: sono le condizioni che il docente ha discusso in aula.'
            : 'In blu le ipotesi sensate.' + (casuale ? ' E ricorda la frase del docente: in geografia non c\u2019\u00e8 niente di casuale, la distribuzione ha sempre delle ragioni.' : ' Le altre confondono densit\u00e0, numero di abitanti e grandezza del territorio, che qui sono uguali.');
          return { ok: tutto, chiave: 'perche', testo: t };
        });
      });
      if (v.meta) {
        coda.push(function () {
          var q = n.accentrata;
          return passo('Nel quadrato ' + q + ' tutta la met\u00e0 oltre la diagonale \u00e8 disabitata. Qual \u00e8 la densit\u00e0 della sola parte abitata?', function (box) {
            var c = campoNum('Densit\u00e0 della parte abitata', 'ab/km\u00b2'); box.appendChild(c.riga); return c.input;
          }, function (i) {
            var x = numero(i.value); if (isNaN(x)) { i.focus(); return null; }
            var giusto = 2 * d, meta = A2 / 2;
            if (Math.abs(x - giusto) < 0.01) return { ok: true, testo: 'Giusto: ' + N + ' abitanti su ' + fmtNum(meta) + ' km\u00b2 = ' + giusto + ' ab/km\u00b2. Il doppio della media: dove la gente vive davvero, vive molto pi\u00f9 fitta.' };
            return { ok: false, chiave: 'meta', testo: (Math.abs(x - d) < 0.01 ? 'Hai diviso per tutta l\u2019area. ' : '') + 'La parte abitata \u00e8 met\u00e0 quadrato, ' + fmtNum(meta) + ' km\u00b2: ' + N + ' / ' + fmtNum(meta) + ' = ' + giusto + ' ab/km\u00b2.' };
          });
        });
      }
    }

    function chiudi() {
      var chiave = ['area', 'densA', 'densB', 'distr'];
      var preso = chiave.every(function (k) { return primoTentativo[k] !== false; });
      var st = segna(e.id || 'densita', preso);
      esitoBox.innerHTML = '';
      esitoBox.appendChild(el('p', { class: 'esx-esito ' + (preso ? 'preso' : 'perso'), text: preso ? 'Punto preso.' : 'Punto perso.' }));
      esitoBox.appendChild(el('p', { class: preso ? 'esx-ok' : 'esx-err',
        text: preso ? 'Area, densit\u00e0 e distribuzione giuste al primo colpo: \u00e8 il punto della prova scritta.'
                    : 'Per il punto servono area, densit\u00e0 e distribuzione giuste al primo tentativo. Rifai una variante: i numeri cambiano, il metodo resta.' }));
      esitoBox.appendChild(el('ol', { class: 'esx-passi' }, [
        el('li', { text: 'Area del quadrato = lato \u00d7 lato = ' + v.L + ' \u00d7 ' + v.L + ' = ' + v.L * v.L + ' km\u00b2.' }),
        el('li', { text: 'Densit\u00e0 = abitanti / area = ' + v.N + ' / ' + v.L * v.L + ' = ' + v.d + ' ab/km\u00b2, in tutti e due i quadrati.' }),
        el('li', { text: 'Stessa densit\u00e0, distribuzione diversa: una sparsa, una accentrata. Poi ci si chiede perch\u00e9: acqua, terra fertile, strade, sicurezza.' })
      ]));
      esitoBox.appendChild(el('p', { class: 'esx-conti', text: testoStats(e.id || 'densita') }));
      var b = el('button', { type: 'button', class: 'esx-btn', text: 'Nuova variante' });
      b.addEventListener('click', nuovaVariante);
      esitoBox.appendChild(el('div', { class: 'esx-azioni' }, [b]));
    }

    function nuovaVariante() {
      v = variante(); primoTentativo = {};
      area.innerHTML = '';
      var tav = el('div', { class: 'esx-tavola' });
      var due = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:6px' }, [
        quadrato('A', v.sparsaA ? v.pSparsa : v.pAccentrata, !v.sparsaA && v.pozzo),
        quadrato('B', v.sparsaA ? v.pAccentrata : v.pSparsa, v.sparsaA && v.pozzo)
      ]);
      tav.appendChild(due);
      if (v.pozzo) tav.appendChild(el('p', { class: 'esx-mini', style: 'margin:6px 8px 2px;color:#8B6E4B', text: 'Il cerchio blu indica un pozzo.' }));
      var fog = el('div', { class: 'esx-foglio' });
      fog.appendChild(el('h4', { text: 'Rispondi un passo alla volta' }));
      passi = el('div');
      fog.appendChild(passi);
      esitoBox = el('div', { class: 'esx-corr', 'aria-live': 'polite' });
      esitoBox.appendChild(el('p', { class: 'esx-conti', text: testoStats(e.id || 'densita') }));
      area.appendChild(el('div', { class: 'esx-banco' }, [tav, fog]));
      area.appendChild(esitoBox);
      costruisciPassi();
      var primo = coda.shift(); passi.appendChild(primo());
      riapriPannello();
    }
    nuovaVariante();
  }

  /* =====================================================================
     TIPI NUOVI CON UN DISEGNO: in attesa del generatore vettoriale
     ===================================================================== */
  function InArrivo(area, e) {
    var f = el('div', { class: 'esx-foglio' });
    f.appendChild(el('h4', { text: 'Esercizio interattivo in preparazione' }));
    f.appendChild(el('p', { class: 'esx-consegna', text: 'Questo esercizio si risolve su un disegno con misure precise. ' +
      'Per non darti figure sbagliate, qui arriver\u00e0 con un disegno costruito apposta, sempre diverso a ogni tentativo. ' +
      'Intanto trovi sotto il metodo spiegato in aula.' }));
    area.appendChild(f);
  }

  /* =====================================================================
     3. TIPI NUOVI: varianti preparate da NotebookLM
     ===================================================================== */
  function Banca(area, e) {
    var recenti = [];
    function prossima() {
      var idx = [];
      for (var i = 0; i < e.banca.length; i++) if (recenti.indexOf(i) < 0) idx.push(i);
      if (!idx.length) { recenti = []; return prossima(); }
      var k = pesca(idx); recenti.push(k); if (recenti.length > Math.min(10, e.banca.length - 1)) recenti.shift();
      return k;
    }
    function nuova() {
      var q = e.banca[prossima()];
      area.innerHTML = '';
      var fog = el('div', { class: 'esx-foglio' });
      fog.appendChild(el('h4', { text: q.domanda }));
      var nome = 'esx-b-' + Math.random().toString(36).slice(2);
      var ordine = mescola(q.opzioni.map(function (t, i) { return { t: t, i: i }; }));
      var cont = el('div', { class: 'esx-opz' });
      ordine.forEach(function (o) {
        o.r = el('input', { type: 'radio', name: nome });
        o.lab = el('label', null, [o.r, el('span', { text: o.t })]);
        cont.appendChild(o.lab);
      });
      fog.appendChild(cont);
      var corr = el('div', { class: 'esx-corr', 'aria-live': 'polite' });
      var b = el('button', { type: 'button', class: 'esx-btn', text: 'Correggi' });
      var n2 = el('button', { type: 'button', class: 'esx-btn sec', text: 'Nuova variante' });
      b.addEventListener('click', function () {
        var sc = ordine.filter(function (o) { return o.r.checked; })[0];
        if (!sc) return;
        b.disabled = true;
        ordine.forEach(function (o) { o.r.disabled = true; if (o.i === q.corretta) o.lab.classList.add('giusta'); });
        var preso = sc.i === q.corretta;
        if (!preso) sc.lab.classList.add('sbagliata');
        segna(e.id || 'banca', preso);
        corr.innerHTML = '';
        corr.appendChild(el('p', { class: 'esx-esito ' + (preso ? 'preso' : 'perso'), text: preso ? 'Giusto.' : 'Non \u00e8 questa.' }));
        if (q.spiegazione) corr.appendChild(el('p', { class: 'esx-consegna', text: q.spiegazione }));
        corr.appendChild(el('p', { class: 'esx-conti', text: testoStats(e.id || 'banca') }));
        riapriPannello();
      });
      n2.addEventListener('click', nuova);
      fog.appendChild(el('div', { class: 'esx-azioni' }, [b, n2]));
      area.appendChild(fog);
      area.appendChild(corr);
      riapriPannello();
    }
    nuova();
  }
})();
