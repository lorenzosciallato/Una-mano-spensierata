/* ============================================================
   UNA MANO SPENSIERATA — ESERCIZI D'ESAME  (v2)
   Compare nella lezione SOLO se il JSON ha "esercizi.trovati".

   Per ogni esercizio tre cose, in quest'ordine:
     1. IMPARA IL METODO  tutorial animato, costruito sull'esempio
                          svolto in aula dal docente
     2. ALLENATI          serie da 15 esercizi sempre diversi, con
                          correzione "a matita rossa e blu" e la
                          soluzione animata passo passo
     3. STAMPA            una scheda da 15 su carta, soluzioni in fondo

   SOLO DISEGNI VETTORIALI: il disegno nasce dai numeri, quindi un
   luogo a 22°15′ sta esattamente a 22°15′. Niente immagini generate.

   Tipi: reticolo_coordinate, densita_popolamento, altro (scorta di
   varianti preparata dal server, oppure "da costruire").
============================================================ */
(function () {
  'use strict';

  var file = null;
  try { file = new URLSearchParams(location.search).get('file'); } catch (e) {}
  if (!file) return;

  var RIDUCI = false;
  try { RIDUCI = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  fetch(file).then(function (r) { return r.json(); }).then(function (d) {
    var b = d && d.esercizi;
    var lista = (b && Array.isArray(b.trovati) ? b.trovati : []).filter(function (e) {
      if (!e || !e.tipo) return false;
      if (e.tipo === 'altro') return e.da_costruire || (Array.isArray(e.banca) && e.banca.length > 0);
      return e.tipo === 'reticolo_coordinate' || e.tipo === 'densita_popolamento';
    });
    if (lista.length) monta(lista);
  }).catch(function (err) { try { console.error('Esercizi d\u2019esame:', err); } catch (e) {} });

  /* =================================================================
     UTILITÀ
     ================================================================= */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, figli) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (figli || []).forEach(function (f) { if (f != null) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return n;
  }
  function sv(tag, attrs, testo) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (testo != null) n.textContent = testo;
    return n;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function numero(v) {
    if (v == null) return NaN;
    var s = String(v).trim().replace(',', '.');
    return s === '' ? NaN : Number(s);
  }
  function fmt(x) { return (Math.round(x * 100) / 100).toString().replace('.', ','); }
  function coord(g, m, d) { return g + '\u00b0' + pad2(m) + '\u2032 ' + d; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // generatore pseudocasuale con seme: la stessa serie si può riprendere e ristampare
  function rngDa(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rint(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function rpick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function rmescola(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function nuovoSeme() { return 100000 + Math.floor(Math.random() * 900000); }

  // timer delle animazioni: si cancellano tutti quando si cambia passo
  function Orologio() {
    var lista = [];
    return {
      dopo: function (ms, fn) { if (RIDUCI || ms <= 0) { fn(); return; } lista.push(setTimeout(fn, ms)); },
      ferma: function () { lista.forEach(clearTimeout); lista = []; }
    };
  }
  // comparsa morbida dopo un ritardo (niente, se anim = false)
  function appariDopo(nodo, anim, t, ritardo) {
    if (!anim || RIDUCI) return;
    nodo.style.opacity = '0';
    nodo.style.transition = 'opacity .4s ease';
    t.dopo(ritardo || 20, function () { nodo.style.opacity = '1'; });
  }
  // una linea che "si disegna"
  function traccia(linea, anim, t, ritardo, durata) {
    if (!anim || RIDUCI) return;
    var x1 = +linea.getAttribute('x1'), y1 = +linea.getAttribute('y1');
    var x2 = +linea.getAttribute('x2'), y2 = +linea.getAttribute('y2');
    var L = Math.hypot(x2 - x1, y2 - y1) || 1;
    var das = linea.getAttribute('stroke-dasharray');
    linea.setAttribute('stroke-dasharray', L + ' ' + L);
    linea.setAttribute('stroke-dashoffset', L);
    linea.style.transition = 'stroke-dashoffset ' + ((durata || 600) / 1000) + 's ease';
    t.dopo(ritardo || 20, function () {
      linea.setAttribute('stroke-dashoffset', 0);
      if (das) t.dopo((durata || 600) + 50, function () { linea.setAttribute('stroke-dasharray', das); linea.removeAttribute('stroke-dashoffset'); });
    });
  }

  function riapriPannello() {
    var p = document.querySelector('#acc-esercizi .accordion-content.active');
    if (p) p.style.maxHeight = p.scrollHeight + 15000 + 'px';
  }
  function stretto() { return window.innerWidth < 640; }

  /* ---------------- archivio nel browser ---------------- */
  function leggi(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function scrivi(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function chiave(e, cosa) { return 'ums_esx2::' + file + '::' + (e.id || e.tipo) + '::' + cosa; }

  /* =================================================================
     STILE
     ================================================================= */
  var CARTA = '#F3EAD6', INCH = '#352A1F', SEPPIA = '#8B6E4B', ROSSO = '#B3261E', BLU = '#2350A0', ORO = '#C8A96E';
  function stile() {
    if (document.getElementById('esx-stile')) return;
    var css = [
      '#esx-root{font-family:var(--font-body);color:var(--body)}',
      '.esx-scelta{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px}',
      '.esx-scelta button{font:600 .9rem/1.2 var(--font-body);padding:10px 16px;border-radius:999px;cursor:pointer;',
      'border:1px solid var(--gold-lt);background:transparent;color:var(--ink);text-align:left}',
      '.esx-scelta button[aria-pressed=true]{background:var(--navy);border-color:var(--navy);color:#fff}',
      '.esx-scelta small{display:block;font-weight:400;opacity:.75;font-size:.78rem;margin-top:2px}',
      '.esx-titolo{font:700 1.5rem/1.25 var(--font-display);color:var(--ink);margin:0 0 4px}',
      '.esx-valore{font-size:.95rem;color:var(--sub);margin:0 0 18px;max-width:68ch;line-height:1.55}',
      '.esx-modi{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 22px}',
      '.esx-modi button{display:flex;gap:12px;align-items:center;text-align:left;cursor:pointer;padding:14px 16px;',
      'border-radius:14px;border:1px solid var(--dust);background:transparent;color:var(--ink);font:inherit}',
      '.esx-modi button b{font:700 1.5rem/1 var(--font-display);color:var(--gold-dk);min-width:1.1em}',
      '.esx-modi button span{font-weight:600;line-height:1.3}',
      '.esx-modi button small{display:block;font-weight:400;color:var(--sub);font-size:.82rem;margin-top:2px}',
      '.esx-modi button[aria-pressed=true]{border-color:var(--navy);box-shadow:inset 0 0 0 1px var(--navy);background:rgba(26,47,79,.04)}',
      '.night-mode .esx-modi button[aria-pressed=true]{background:rgba(255,255,255,.04);border-color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold)}',
      '.esx-modi button:focus-visible,.esx-btn:focus-visible,.esx-seg button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}',
      '@media (max-width:640px){.esx-modi{grid-template-columns:1fr}.esx-modi button{padding:11px 14px}}',
      '.esx-banco{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:22px;align-items:start}',
      '.esx-banco.solo{grid-template-columns:minmax(0,1fr)}',
      '@media (max-width:860px){.esx-banco{grid-template-columns:1fr}}',
      '@media (min-width:861px){.esx-banco>.esx-tavola{position:sticky;top:calc(var(--topbar-h,62px) + 16px)}}',
      '.esx-tavola{background:' + CARTA + ';border-radius:12px;padding:10px;',
      'box-shadow:inset 0 0 0 1px rgba(139,110,75,.35),inset 0 0 60px rgba(139,110,75,.18)}',
      '.esx-tavola svg{display:block;width:100%;height:auto}',
      '.esx-tavola svg text{font-family:var(--font-display)}',
      '.esx-tavola svg text:not([fill]){fill:' + INCH + '}',
      '.esx-lavagna,.esx-foglio{background:#fff;border:1px solid var(--dust);border-radius:12px;padding:18px 18px 16px}',
      '.night-mode .esx-lavagna,.night-mode .esx-foglio{background:var(--ivory-dk)}',
      '.esx-passo-n{font-size:.85rem;color:var(--sub);margin:0 0 6px}',
      '.esx-barra{display:flex;gap:4px;margin:0 0 14px}',
      '.esx-barra i{flex:1;height:4px;border-radius:2px;background:var(--dust)}',
      '.esx-barra i.fatto{background:var(--gold)}.esx-barra i.ora{background:var(--navy)}',
      '.night-mode .esx-barra i.ora{background:var(--gold-lt)}',
      '.esx-lavagna h4{font:700 1.2rem/1.3 var(--font-display);color:var(--ink);margin:0 0 8px}',
      '.esx-lavagna p{margin:0 0 10px;line-height:1.62;font-size:1.02rem}',
      '.esx-regola{display:block;margin:12px 0 4px;padding:10px 12px;border-radius:10px;background:rgba(200,169,110,.16);',
      'color:var(--ink);font-weight:600;line-height:1.45}',
      '.esx-extra{margin:10px 0 0;display:flex;justify-content:center}',
      '.esx-extra svg{max-width:210px;width:100%;height:auto}',
      '.esx-comandi{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;align-items:center}',
      '.esx-btn{font:600 .95rem/1 var(--font-body);padding:12px 18px;border-radius:999px;cursor:pointer;border:1px solid var(--navy);',
      'background:var(--navy);color:#fff}',
      '.esx-btn.sec{background:transparent;color:var(--ink);border-color:var(--gold-lt)}',
      '.esx-btn.pic{padding:9px 14px;font-size:.88rem}',
      '.esx-btn[disabled]{opacity:.45;cursor:not-allowed}',
      '.esx-tasti{font-size:.8rem;color:var(--sub);margin:10px 0 0}',
      '.esx-foglio h4{font:700 1.08rem/1.3 var(--font-display);color:var(--ink);margin:0 0 12px}',
      '.esx-luogo{border-top:1px dashed rgba(139,110,75,.45);padding-top:12px;margin-top:12px}',
      '.esx-luogo:first-of-type{border-top:0;padding-top:0;margin-top:0}',
      '.esx-luogo h5{font:700 1rem/1.3 var(--font-display);color:var(--ink);margin:0 0 8px}',
      '.esx-riga{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px}',
      '.esx-riga>.esx-lab{min-width:92px;font-weight:600;color:var(--ink);font-size:.92rem}',
      '@media (max-width:640px){.esx-riga>.esx-lab{flex-basis:100%}}',
      '.esx-campo{width:3.6em;font:600 1.12rem/1 var(--font-display);text-align:center;padding:7px 3px;',
      'border:0;border-bottom:2px solid ' + SEPPIA + ';background:transparent;color:var(--ink);border-radius:0}',
      '.esx-campo.largo{width:5em}',
      '.esx-campo:focus{outline:2px solid var(--gold);outline-offset:2px}',
      '.esx-campo.ok{border-bottom-color:' + BLU + ';color:' + BLU + '}',
      '.esx-campo.ko{border-bottom-color:' + ROSSO + ';color:' + ROSSO + '}',
      '.night-mode .esx-campo.ok{color:#8FB4E8;border-bottom-color:#8FB4E8}.night-mode .esx-campo.ko{color:#EF9A9A;border-bottom-color:#EF9A9A}',
      '.esx-unita{font:italic 1.05rem var(--font-display);color:' + SEPPIA + '}',
      '.esx-giusto{font:italic .92rem var(--font-display);color:' + BLU + ';margin-left:4px}',
      '.night-mode .esx-giusto{color:#8FB4E8}',
      '.esx-seg{display:inline-flex;border:1px solid ' + SEPPIA + ';border-radius:999px;overflow:hidden}',
      '.esx-seg button{font:600 .88rem/1 var(--font-body);padding:8px 12px;border:0;background:transparent;color:var(--ink);cursor:pointer}',
      '.esx-seg button[aria-pressed=true]{background:' + SEPPIA + ';color:#fff}',
      '.esx-seg.ok{border-color:' + BLU + ';box-shadow:0 0 0 1px ' + BLU + '}.esx-seg.ko{border-color:' + ROSSO + ';box-shadow:0 0 0 1px ' + ROSSO + '}',
      '.esx-chips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px}',
      '.esx-chips label{display:flex;gap:8px;align-items:flex-start;padding:8px 12px;border:1px solid var(--dust);border-radius:10px;',
      'cursor:pointer;line-height:1.35;font-size:.92rem;flex:1 1 230px}',
      '.esx-chips label.giusta{border-color:' + BLU + ';box-shadow:inset 3px 0 0 ' + BLU + '}',
      '.esx-chips label.sbagliata{border-color:' + ROSSO + ';box-shadow:inset 3px 0 0 ' + ROSSO + '}',
      '.esx-esito{margin-top:18px;border-left:3px solid ' + SEPPIA + ';padding:2px 0 2px 16px}',
      '.esx-verdetto{font:700 1.3rem/1.3 var(--font-display);margin:0 0 8px}',
      '.esx-verdetto.preso{color:' + BLU + '}.esx-verdetto.perso{color:' + ROSSO + '}',
      '.night-mode .esx-verdetto.preso{color:#8FB4E8}.night-mode .esx-verdetto.perso{color:#EF9A9A}',
      '.esx-err{color:' + ROSSO + ';margin:0 0 6px;line-height:1.5;max-width:70ch}',
      '.night-mode .esx-err{color:#EF9A9A}',
      '.esx-nota{color:var(--sub);font-size:.9rem;margin:6px 0 0;line-height:1.5}',
      '.esx-serie{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin:0 0 14px}',
      '.esx-serie strong{font:700 1.1rem var(--font-display);color:var(--ink)}',
      '.esx-tacche{display:flex;gap:3px;flex:1 1 220px;min-width:180px}',
      '.esx-tacche i{flex:1;height:8px;border-radius:2px;background:var(--dust)}',
      '.esx-tacche i.preso{background:' + BLU + '}.esx-tacche i.perso{background:' + ROSSO + '}',
      '.esx-tacche i.ora{box-shadow:0 0 0 2px var(--gold)}',
      '.esx-riep,.esx-stampa{border:1px solid var(--dust);border-radius:14px;padding:22px}',
      '.esx-riep .num{font:700 2.6rem/1 var(--font-display);color:var(--ink);margin:0}',
      '.esx-riep ul{margin:10px 0 0;padding-left:1.2em;line-height:1.6}',
      '.esx-stampa{max-width:70ch}.esx-stampa p{line-height:1.6;margin:0 0 12px}',
      '.esx-docente{margin-top:12px;padding-top:10px;border-top:1px solid var(--dust)}',
      '.esx-docente h5{font:600 .95rem var(--font-body);color:var(--ink);margin:10px 0 4px}',
      '.esx-docente ul{margin:0;padding-left:1.2em;line-height:1.55;font-size:.95rem}',
      '.esx-etic-trappola{cursor:pointer}.esx-etic-trappola:focus{outline:none}',
      '.esx-etic-trappola:focus rect,.esx-etic-trappola:hover rect{stroke:' + ORO + ';stroke-width:2}'
    ].join('');
    document.head.appendChild(el('style', { id: 'esx-stile', text: css }));
  }

  /* =================================================================
     MONTAGGIO DELLA SEZIONE
     ================================================================= */
  function monta(lista) {
    var acc = document.getElementById('acc-esercizi');
    var root = document.getElementById('esx-root');
    if (!acc || !root) return;
    stile();
    acc.style.display = '';
    var n = document.getElementById('esx-conteggio');
    if (n) n.textContent = lista.length === 1 ? 'Un esercizio della prova scritta.' : lista.length + ' esercizi della prova scritta.';
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
    var fermaCorrente = null;
    var voci = lista.map(function (e) { return { e: e, T: motoreDi(e) }; }).filter(function (x) { return x.T; });
    function apri(e) {
      if (fermaCorrente) fermaCorrente();
      palco.innerHTML = '';
      var x = esercizio(e, voci);
      fermaCorrente = x.ferma;
      palco.appendChild(x.nodo);
      riapriPannello();
    }
    apri(lista[0]);
  }

  function motoreDi(e) {
    return e.tipo === 'reticolo_coordinate' ? RETICOLO : e.tipo === 'densita_popolamento' ? DENSITA
         : e.da_costruire ? null : BANCA;
  }
  function esercizio(e, voci) {
    var T = motoreDi(e);
    var box = el('div');
    box.appendChild(el('h3', { class: 'esx-titolo', text: e.titolo || 'Esercizio' }));
    box.appendChild(el('p', { class: 'esx-valore', text: (e.punti_esame ? 'All\u2019esame vale ' + e.punti_esame + '. ' : '') +
      'I numeri cambiano ogni volta, il metodo resta lo stesso.' }));
    if (!T) { box.appendChild(inArrivo(e)); return { nodo: box, ferma: null }; }
    var contenuto = el('div');
    var conTutorial = !!T.tutorial;
    var modi = [
      { k: 'impara', n: '1', t: 'Impara il metodo', s: 'Animazione passo passo', ok: conTutorial },
      { k: 'allena', n: conTutorial ? '2' : '1', t: 'Allenati', s: '15 esercizi sempre diversi', ok: true },
      { k: 'stampa', n: conTutorial ? '3' : '2', t: 'Stampa la scheda', s: voci.length > 1 ? 'Tutti gli esercizi, con il metodo' : 'Il metodo e 15 esercizi', ok: true }
    ].filter(function (m) { return m.ok; });
    var bar = el('div', { class: 'esx-modi', role: 'group', 'aria-label': 'Che cosa vuoi fare' });
    var bottoni = {};
    modi.forEach(function (m) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false' }, [el('b', { text: m.n }), el('span', null, [m.t, el('small', { text: m.s })])]);
      b.addEventListener('click', function () { vai(m.k); });
      bottoni[m.k] = b; bar.appendChild(b);
    });
    box.appendChild(bar);
    box.appendChild(contenuto);
    var ferma = null;
    function vai(k) {
      if (ferma) { ferma(); ferma = null; }
      Object.keys(bottoni).forEach(function (x) { bottoni[x].setAttribute('aria-pressed', x === k ? 'true' : 'false'); });
      contenuto.innerHTML = '';
      if (k === 'impara') ferma = Tutorial(contenuto, T, e, function () { vai('allena'); });
      else if (k === 'allena') ferma = Serie(contenuto, T, e, function () { vai('stampa'); });
      else PannelloStampa(contenuto, voci);
      riapriPannello();
    }
    vai(conTutorial && !leggi(chiave(e, 'tutorial')) ? 'impara' : 'allena');
    return { nodo: box, ferma: function () { if (ferma) ferma(); } };
  }

  function inArrivo(e) {
    var f = el('div', { class: 'esx-foglio' });
    f.appendChild(el('h4', { text: 'Esercizio interattivo in preparazione' }));
    f.appendChild(el('p', { class: 'esx-valore', text: 'Questo esercizio si risolve su un disegno con misure precise. ' +
      'Arriver\u00e0 con un disegno costruito apposta, sempre diverso a ogni tentativo. Intanto ecco il metodo spiegato in aula.' }));
    var d = docente(e); if (d) f.appendChild(d);
    return f;
  }

  function docente(e) {
    var blocchi = [];
    function lista(tit, arr) {
      if (!arr || !arr.length) return;
      blocchi.push(el('h5', { text: tit }));
      blocchi.push(el('ul', null, arr.map(function (t) { return el('li', { text: t }); })));
    }
    lista('Dalle parole del docente', e.consigli_docente);
    lista('Gli errori che vede ogni anno', e.errori_comuni);
    if (!blocchi.length) return null;
    return el('div', { class: 'esx-docente' }, blocchi);
  }

  function segmentato(opzioni, etichetta) {
    var box = el('div', { class: 'esx-seg', role: 'group', 'aria-label': etichetta });
    var valore = null;
    opzioni.forEach(function (o) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false', text: o.t });
      b.addEventListener('click', function () {
        if (box.bloccato) return;
        valore = o.v;
        Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      box.appendChild(b);
    });
    box.valore = function () { return valore; };
    box.blocca = function () { box.bloccato = true; };
    return box;
  }

  /* =================================================================
     LETTORE: tutorial animato e soluzione passo passo
     def = { scena: fn(nome) -> {nodo, api},
             passi: [{scena, titolo, testo, regola, extra(t), dopo(), fai(api, anim, t)}] }
     Ogni passo si può rivedere: la scena si ricostruisce e i passi
     precedenti si applicano senza animazione, quello corrente animato.
     ================================================================= */
  function Lettore(dove, def, opzioni) {
    opzioni = opzioni || {};
    var k = 0, t = Orologio();
    var tav = el('div', { class: 'esx-tavola' });
    var lav = el('div', { class: 'esx-lavagna', 'aria-live': 'polite' });
    var banco = el('div', { class: 'esx-banco' }, [tav, lav]);
    dove.appendChild(banco);
    var passi = def.passi;
    function mostra(n) {
      t.ferma();
      k = Math.max(0, Math.min(passi.length - 1, n));
      var p = passi[k];
      var sc = def.scena(p.scena);
      tav.innerHTML = ''; tav.appendChild(sc.nodo);
      var inizio = k; while (inizio > 0 && passi[inizio - 1].scena === p.scena) inizio--;
      for (var j = inizio; j < k; j++) if (passi[j].fai && !passi[j].momentaneo) passi[j].fai(sc.api, false, t);
      if (p.fai) p.fai(sc.api, true, t);
      lav.innerHTML = '';
      lav.appendChild(el('p', { class: 'esx-passo-n', text: 'Passo ' + (k + 1) + ' di ' + passi.length }));
      var barra = el('div', { class: 'esx-barra', 'aria-hidden': 'true' });
      passi.forEach(function (_x, i) { barra.appendChild(el('i', { class: i < k ? 'fatto' : i === k ? 'ora' : '' })); });
      lav.appendChild(barra);
      if (p.titolo) lav.appendChild(el('h4', { text: p.titolo }));
      (Array.isArray(p.testo) ? p.testo : [p.testo]).forEach(function (x) { if (x) lav.appendChild(el('p', { text: x })); });
      if (p.regola) lav.appendChild(el('span', { class: 'esx-regola', text: p.regola }));
      if (p.extra) { var ex = p.extra(t); if (ex) lav.appendChild(el('div', { class: 'esx-extra' }, [ex])); }
      if (p.dopo) { var dx = p.dopo(); if (dx) lav.appendChild(dx); }
      var ultimo = k === passi.length - 1;
      var indietro = el('button', { type: 'button', class: 'esx-btn sec', text: 'Indietro' });
      indietro.disabled = k === 0;
      indietro.addEventListener('click', function () { mostra(k - 1); });
      var avanti = null;
      if (!ultimo) {
        avanti = el('button', { type: 'button', class: 'esx-btn', text: 'Avanti' });
        avanti.addEventListener('click', function () { mostra(k + 1); });
      } else if (opzioni.fine) {
        avanti = el('button', { type: 'button', class: 'esx-btn', text: opzioni.fine.testo });
        avanti.addEventListener('click', opzioni.fine.azione);
      }
      lav.appendChild(el('div', { class: 'esx-comandi' }, [indietro, avanti]));
      if (!stretto()) lav.appendChild(el('p', { class: 'esx-tasti', text: 'Puoi usare anche le frecce della tastiera.' }));
      if (ultimo && opzioni.allaFine) opzioni.allaFine();
      riapriPannello();
    }
    function tasti(ev) {
      if (!document.body.contains(banco)) { document.removeEventListener('keydown', tasti); return; }
      var tag = (ev.target && ev.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      var r = banco.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (ev.key === 'ArrowRight' && k < passi.length - 1) { ev.preventDefault(); mostra(k + 1); }
      if (ev.key === 'ArrowLeft' && k > 0) { ev.preventDefault(); mostra(k - 1); }
    }
    document.addEventListener('keydown', tasti);
    mostra(0);
    return function () { t.ferma(); document.removeEventListener('keydown', tasti); };
  }

  function Tutorial(dove, T, e, versoAllenamento) {
    return Lettore(dove, T.tutorial(e), {
      fine: { testo: 'Allenati: 15 esercizi', azione: versoAllenamento },
      allaFine: function () { scrivi(chiave(e, 'tutorial'), true); }
    });
  }

  /* =================================================================
     SERIE DA 15
     La serie nasce da un "seme": si riprende dove la si era lasciata,
     e "Rifai gli sbagliati" ripropone esattamente gli stessi esercizi.
     ================================================================= */
  var N_SERIE = 15;
  function Serie(dove, T, e, versoStampa) {
    var K = chiave(e, 'serie');
    var opz = T.opzioni ? T.opzioni() : {};
    var firma = JSON.stringify(opz);
    var stato = leggi(K);
    if (!stato || !stato.seme || !Array.isArray(stato.esiti) || stato.opz !== firma) stato = { seme: nuovoSeme(), i: 0, esiti: [], opz: firma };
    var varianti;
    function prepara() {
      varianti = T.serie(stato.seme, N_SERIE, opz, e);
      if (stato.solo) varianti = stato.solo.map(function (i) { return varianti[i]; });
    }
    prepara();
    var ferma = null;
    function salva() { scrivi(K, stato); }
    function nuova(soloSbagliati) {
      if (soloSbagliati) {
        var idx = [];
        stato.esiti.forEach(function (x, i) { if (x && !x.preso) idx.push(stato.solo ? stato.solo[i] : i); });
        stato = { seme: stato.seme, i: 0, esiti: [], opz: firma, solo: idx };
      } else stato = { seme: nuovoSeme(), i: 0, esiti: [], opz: firma };
      salva(); prepara(); disegna();
    }
    function testata() {
      var h = el('div', { class: 'esx-serie' }), tot = varianti.length;
      h.appendChild(el('strong', { text: stato.i < tot ? 'Esercizio ' + (stato.i + 1) + ' di ' + tot : 'Serie completata' }));
      var tac = el('div', { class: 'esx-tacche', 'aria-hidden': 'true' });
      for (var i = 0; i < tot; i++) {
        var x = stato.esiti[i];
        tac.appendChild(el('i', { class: (x ? (x.preso ? 'preso' : 'perso') : '') + (i === stato.i ? ' ora' : '') }));
      }
      h.appendChild(tac);
      var presi = stato.esiti.filter(function (x) { return x && x.preso; }).length;
      h.appendChild(el('span', { class: 'esx-nota', style: 'margin:0', text: 'Punti presi: ' + presi }));
      var b = el('button', { type: 'button', class: 'esx-btn sec pic', text: 'Nuova serie' });
      b.addEventListener('click', function () { if (!stato.esiti.length || confirm('Iniziare una nuova serie da 15? I risultati di questa si perdono.')) nuova(false); });
      h.appendChild(b);
      return h;
    }
    function disegna() {
      if (ferma) { ferma(); ferma = null; }
      dove.innerHTML = '';
      dove.appendChild(testata());
      if (stato.i >= varianti.length) { dove.appendChild(riepilogo()); riapriPannello(); return; }
      var area = el('div');
      dove.appendChild(area);
      ferma = esercitati(area, varianti[stato.i]);
      riapriPannello();
    }
    function esercitati(area, v) {
      var q = T.domanda(v);
      var fog = el('div', { class: 'esx-foglio' }, [q.foglio]);
      var correggi = el('button', { type: 'button', class: 'esx-btn', text: 'Correggi' });
      fog.appendChild(el('div', { class: 'esx-comandi' }, [correggi]));
      var banco = T.senzaTavola ? el('div', { class: 'esx-banco solo' }, [fog]) : el('div', { class: 'esx-banco' }, [el('div', { class: 'esx-tavola' }, [q.nodo]), fog]);
      var esito = el('div', { class: 'esx-esito', 'aria-live': 'polite', style: 'display:none' });
      area.appendChild(banco); area.appendChild(esito);
      var fermaLettore = null;
      correggi.addEventListener('click', function () {
        var r = q.leggi();
        if (r === null) return;
        var val = T.valuta(v, r);
        q.segna(val); q.soluzione(false); correggi.remove();
        stato.esiti[stato.i] = { preso: val.preso, err: val.errori.map(function (x) { return x.c; }) };
        salva();
        var vecchia = dove.querySelector('.esx-serie'); if (vecchia) dove.replaceChild(testata(), vecchia);
        esito.style.display = ''; esito.innerHTML = '';
        esito.appendChild(el('p', { class: 'esx-verdetto ' + (val.preso ? 'preso' : 'perso'), text: val.preso ? 'Punto preso.' : 'Punto perso.' }));
        val.errori.slice(0, 5).forEach(function (x) { esito.appendChild(el('p', { class: 'esx-err', text: x.t })); });
        if (val.nota) esito.appendChild(el('p', { class: 'esx-nota', text: val.nota }));
        var ultimo = stato.i + 1 >= varianti.length;
        var succ = el('button', { type: 'button', class: 'esx-btn', text: ultimo ? 'Vedi il riepilogo' : 'Esercizio successivo' });
        succ.addEventListener('click', avanti);
        var cmd = el('div', { class: 'esx-comandi' }, [succ]);
        if (!T.senzaTavola) {
          var passo = el('button', { type: 'button', class: 'esx-btn sec', text: 'Guarda la soluzione passo passo' });
          passo.addEventListener('click', function () {
            if (fermaLettore) fermaLettore();
            area.innerHTML = '';
            var sopra = el('div'); area.appendChild(sopra);
            fermaLettore = Lettore(sopra, T.procedimento(v), { fine: { testo: ultimo ? 'Vedi il riepilogo' : 'Esercizio successivo', azione: avanti } });
            sopra.scrollIntoView({ behavior: RIDUCI ? 'auto' : 'smooth', block: 'start' });
          });
          cmd.appendChild(passo);
        }
        esito.appendChild(cmd);
        riapriPannello();
        succ.focus({ preventScroll: true });
      });
      function avanti() {
        stato.i++; salva(); disegna();
        var s = dove.querySelector('.esx-serie'); if (s) s.scrollIntoView({ behavior: RIDUCI ? 'auto' : 'smooth', block: 'start' });
      }
      return function () { if (fermaLettore) fermaLettore(); };
    }
    function riepilogo() {
      var tot = varianti.length;
      var presi = stato.esiti.filter(function (x) { return x && x.preso; }).length;
      var box = el('div', { class: 'esx-riep' });
      box.appendChild(el('p', { class: 'num', text: presi + ' su ' + tot }));
      box.appendChild(el('p', { class: 'esx-valore', style: 'margin:6px 0 0', text: presi === tot ? 'Tutti i punti presi: il metodo \u00e8 tuo.'
        : 'Punti presi. Gli esercizi sbagliati si possono rifare con gli stessi numeri, cos\u00ec vedi se ora ti tornano.' }));
      var conta = {};
      stato.esiti.forEach(function (x) { ((x && x.err) || []).forEach(function (c) { conta[c] = (conta[c] || 0) + 1; }); });
      var voci = Object.keys(conta).sort(function (a, b) { return conta[b] - conta[a]; });
      if (voci.length) {
        box.appendChild(el('h5', { style: 'font:600 .95rem var(--font-body);color:var(--ink);margin:16px 0 0', text: 'Gli errori che hai fatto di pi\u00f9' }));
        box.appendChild(el('ul', null, voci.slice(0, 5).map(function (c) {
          return el('li', { text: (T.nomiErrori[c] || c) + (conta[c] > 1 ? ' (' + conta[c] + ' volte)' : '') });
        })));
      }
      var cmd = el('div', { class: 'esx-comandi' });
      if (presi < tot) {
        var r = el('button', { type: 'button', class: 'esx-btn', text: 'Rifai ' + (tot - presi === 1 ? 'l\u2019esercizio sbagliato' : 'i ' + (tot - presi) + ' sbagliati') });
        r.addEventListener('click', function () { nuova(true); });
        cmd.appendChild(r);
      }
      var n = el('button', { type: 'button', class: 'esx-btn' + (presi < tot ? ' sec' : ''), text: 'Nuova serie da 15' });
      n.addEventListener('click', function () { nuova(false); });
      var s = el('button', { type: 'button', class: 'esx-btn sec', text: 'Stampa una scheda' });
      s.addEventListener('click', versoStampa);
      cmd.appendChild(n); cmd.appendChild(s);
      box.appendChild(cmd);
      return box;
    }
    disegna();
    return function () { if (ferma) ferma(); };
  }

  /* =================================================================
     STAMPA
     ================================================================= */
  function PannelloStampa(dove, voci) {
    var seme = nuovoSeme();
    var box = el('div', { class: 'esx-stampa' });
    box.appendChild(el('h4', { style: 'font:700 1.15rem var(--font-display);color:var(--ink);margin:0 0 10px', text: 'Scheda da stampare' }));
    box.appendChild(el('p', { text: 'Tutti gli esercizi d\u2019esame di questa lezione (' + voci.map(function (x) { return x.e.titolo; }).join(' e ') + '). ' +
      'Per ognuno: il metodo spiegato passo passo con i disegni, poi 15 esercizi nuovi con lo spazio per le risposte. Le soluzioni sono nelle ultime pagine.' }));
    var numeroScheda = el('p', { class: 'esx-nota' });
    function scriviNumero() { numeroScheda.textContent = 'Scheda n. ' + seme + '. Ristampando la stessa scheda, gli esercizi restano gli stessi.'; }
    scriviNumero();
    box.appendChild(numeroScheda);
    var stampa = el('button', { type: 'button', class: 'esx-btn', text: 'Stampa la scheda' });
    stampa.addEventListener('click', function () { stampaScheda(voci, seme); });
    var altra = el('button', { type: 'button', class: 'esx-btn sec', text: 'Prepara un\u2019altra scheda' });
    altra.addEventListener('click', function () { seme = nuovoSeme(); scriviNumero(); });
    box.appendChild(el('div', { class: 'esx-comandi' }, [stampa, altra]));
    box.appendChild(el('p', { class: 'esx-nota', text: 'Nella finestra di stampa puoi scegliere anche \u00abSalva come PDF\u00bb.' }));
    dove.appendChild(box);
  }

  // Il tutorial su carta: i passi segnati "stampa", con il disegno fermo al punto giusto.
  function tutorialStampato(T, e) {
    if (!T.tutorial) return '';
    var def = T.tutorial(e), passi = def.passi, out = [];
    var scelti = passi.map(function (p, k) { return k; }).filter(function (k) { return passi[k].stampa; });
    if (!scelti.length) scelti = passi.map(function (p, k) { return k; });
    var t = Orologio();
    scelti.forEach(function (k, n) {
      var p = passi[k], fig = '';
      if (p.stampa !== 'testo') {
        var sc = def.scena(p.scena, { stampa: true, fs: 15, larghezza: '84mm' });
        var inizio = k; while (inizio > 0 && passi[inizio - 1].scena === p.scena) inizio--;
        for (var j = inizio; j <= k; j++) if (passi[j].fai && (j === k || !passi[j].momentaneo)) passi[j].fai(sc.api, false, t);
        fig = '<div class="fig">' + sc.nodo.outerHTML + '</div>';
      }
      var testi = (Array.isArray(p.testo) ? p.testo : [p.testo]).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('');
      var extra = p.extra ? p.extra(null) : null;
      out.push('<div class="tut' + (fig ? '' : ' solo') + '">' + fig + '<div class="txt"><h4>' + (n + 1) + '. ' + esc(p.titolo || '') + '</h4>' + testi +
        (p.regola ? '<p class="regola">' + esc(p.regola) + '</p>' : '') + (extra ? '<div class="mini">' + extra.outerHTML + '</div>' : '') + '</div></div>');
    });
    t.ferma();
    return out.join('');
  }

  function htmlScheda(voci, seme) {
    var parti = voci.map(function (x, i) {
      var opz = x.T.opzioniStampa ? x.T.opzioniStampa() : {};
      var varianti = x.T.serie(seme + i * 7919, N_SERIE, opz, x.e);
      return { x: x, varianti: varianti, n: i + 1 };
    });
    var corpo = parti.map(function (pt) {
      var es = pt.varianti.map(function (v, k) { return '<section class="es">' + pt.x.T.stampa(v, k + 1) + '</section>'; }).join('');
      var tut = tutorialStampato(pt.x.T, pt.x.e);
      return '<div class="parte"><h2>' + pt.n + '. ' + esc(pt.x.e.titolo || 'Esercizio') + (pt.x.e.punti_esame ? ' <small>(all\u2019esame vale ' + esc(pt.x.e.punti_esame) + ')</small>' : '') + '</h2>' +
        (tut ? '<h3 class="sez">Come si fa</h3>' + tut : '') +
        '<h3 class="sez nuova">Esercizi</h3>' + pt.x.T.istruzioniStampa + es + '</div>';
    }).join('');
    var sol = '<div class="sol"><h2>Soluzioni della scheda n. ' + seme + '</h2>' + parti.map(function (pt) {
      return '<h3>' + pt.n + '. ' + esc(pt.x.e.titolo || '') + '</h3>' + pt.x.T.soluzioni(pt.varianti);
    }).join('') + '</div>';
    return '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Esercizi d\u2019esame \u2014 scheda ' + seme + '</title>' +
      '<style>' +
      '@page{size:A4;margin:13mm}' +
      'body{font:10.5pt/1.45 Georgia,"Times New Roman",serif;color:#1d1a16;margin:0}' +
      'header{border-bottom:1px solid #999;padding-bottom:6px;margin-bottom:10px}' +
      'header h1{font-size:16pt;margin:0}header p{margin:3px 0 0;font-size:9.5pt;color:#333}' +
      '.parte{break-before:page;page-break-before:always}.parte:first-of-type{break-before:auto;page-break-before:auto}' +
      '.parte h2{font-size:15pt;margin:0 0 6px}.parte h2 small{font-size:10pt;font-weight:400;color:#444}' +
      'h3.sez{font-size:12pt;margin:8px 0 6px;border-bottom:1px solid #ccc;padding-bottom:2px}h3.sez.nuova{break-before:page;page-break-before:always}' +
      '.tut{display:flex;gap:12px;align-items:flex-start;break-inside:avoid;page-break-inside:avoid;margin:0 0 9px}' +
      '.tut .fig{flex:none}.tut .fig svg{display:block}.tut .txt{flex:1}.tut.solo .txt{padding-left:0}' +
      '.tut h4{font-size:11pt;margin:0 0 3px}.tut p{margin:0 0 4px;font-size:10pt}' +
      '.tut .regola{font-weight:700;background:#f1ead9;padding:4px 7px;border-radius:4px}' +
      '.tut .mini svg{width:28mm;height:auto}' +
      '.es{break-inside:avoid;page-break-inside:avoid;border:1px solid #bbb;border-radius:6px;padding:7px 10px;margin:0 0 7px}' +
      '.es h3{font-size:10.5pt;margin:0 0 4px}' +
      '.riga{display:flex;gap:12px;align-items:flex-start}.riga svg{display:block;flex:none}' +
      '.risp{font-size:10pt;line-height:2.15}.risp b{font-weight:700}' +
      '.sol{break-before:page;page-break-before:always}.sol h2{font-size:14pt;margin:0 0 8px}.sol h3{font-size:11.5pt;margin:12px 0 4px}' +
      'table{border-collapse:collapse;width:100%;font-size:9.5pt}td,th{border:1px solid #aaa;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eee}' +
      '</style></head><body>' +
      '<header><h1>Esercizi d\u2019esame</h1><p>Una Mano Spensierata, Geografia. ' + voci.map(function (x) { return esc(x.e.titolo); }).join(' \u2014 ') +
      '<br>Scheda n. ' + seme + '. Nome ________________________ Data ____________</p></header>' + corpo + sol +
      '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>';
  }
  function stampaScheda(voci, seme) {
    var w = window.open('', '_blank');
    if (!w) { alert('Il browser ha bloccato la finestra di stampa: consenti le finestre pop-up per questo sito e riprova.'); return; }
    w.document.open(); w.document.write(htmlScheda(voci, seme)); w.document.close();
  }

  /* =================================================================
     1. COORDINATE SUL RETICOLO
     Il reticolo della prova (lezione 2): assi ortogonali, una linea
     ogni grado, poche linee etichettate ("20° N", "105° E"), due luoghi
     da localizzare (in aula Hanoi e Hong Kong). Si risponde in gradi e
     primi; i primi si stimano come sull'orologio.
     ================================================================= */
  // Città reali: coordinate di Wikipedia (verificate il 30/09/2026), arrotondate ai 5 primi (la precisione di una lettura a occhio).
  // I punti che NON sono città reali hanno nomi di città immaginarie, per non confonderli con luoghi veri.
  var IMMAGINARIE = ['Topolinia', 'Paperopoli', 'Gotham City', 'Metropolis', 'Atlantide', 'Lilliput', 'Utopia', 'El Dorado',
    'Shangri-La', 'Camelot', 'Macondo', 'Springfield', 'Avalon', 'Smallville', 'Brigadoon', 'Laputa'];
  var CITTA = [
    ['Milano', 45, 30, 'N', 9, 10, 'E'],
    ['Torino', 45, 5, 'N', 7, 40, 'E'],
    ['Venezia', 45, 25, 'N', 12, 20, 'E'],
    ['Bologna', 44, 30, 'N', 11, 20, 'E'],
    ['Firenze', 43, 45, 'N', 11, 15, 'E'],
    ['Ancona', 43, 35, 'N', 13, 30, 'E'],
    ['Macerata', 43, 20, 'N', 13, 25, 'E'],
    ['Roma', 41, 55, 'N', 12, 30, 'E'],
    ['Napoli', 40, 50, 'N', 14, 15, 'E'],
    ['Bari', 41, 10, 'N', 16, 50, 'E'],
    ['Palermo', 38, 5, 'N', 13, 20, 'E'],
    ['Cagliari', 39, 15, 'N', 9, 5, 'E'],
    ['Parigi', 48, 50, 'N', 2, 20, 'E'],
    ['Lione', 45, 45, 'N', 4, 50, 'E'],
    ['Marsiglia', 43, 20, 'N', 5, 20, 'E'],
    ['Barcellona', 41, 25, 'N', 2, 10, 'E'],
    ['Ginevra', 46, 10, 'N', 6, 10, 'E'],
    ['Monaco di Baviera', 48, 10, 'N', 11, 35, 'E'],
    ['Vienna', 48, 10, 'N', 16, 20, 'E'],
    ['Budapest', 47, 30, 'N', 19, 5, 'E'],
    ['Praga', 50, 5, 'N', 14, 25, 'E'],
    ['Berlino', 52, 30, 'N', 13, 25, 'E'],
    ['Varsavia', 52, 15, 'N', 21, 0, 'E'],
    ['Zagabria', 45, 50, 'N', 16, 0, 'E'],
    ['Lubiana', 46, 5, 'N', 14, 30, 'E'],
    ['Belgrado', 44, 50, 'N', 20, 25, 'E'],
    ['Atene', 38, 0, 'N', 23, 45, 'E'],
    ['Sofia', 42, 40, 'N', 23, 20, 'E'],
    ['Bucarest', 44, 25, 'N', 26, 5, 'E'],
    ['Istanbul', 41, 0, 'N', 28, 55, 'E'],
    ['Copenaghen', 55, 40, 'N', 12, 35, 'E'],
    ['Oslo', 59, 55, 'N', 10, 45, 'E'],
    ['Stoccolma', 59, 20, 'N', 18, 5, 'E'],
    ['Madrid', 40, 25, 'N', 3, 40, 'O'],
    ['Lisbona', 38, 45, 'N', 9, 10, 'O'],
    ['Il Cairo', 30, 5, 'N', 31, 15, 'E'],
    ['Alessandria d\u2019Egitto', 31, 10, 'N', 29, 55, 'E'],
    ['Gerusalemme', 31, 45, 'N', 35, 15, 'E'],
    ['Hanoi', 21, 0, 'N', 105, 50, 'E'],
    ['Hong Kong', 22, 20, 'N', 114, 10, 'E'],
    ['Haiphong', 20, 50, 'N', 106, 40, 'E'],
    ['Macao', 22, 10, 'N', 113, 30, 'E'],
    ['Canton', 23, 10, 'N', 113, 15, 'E'],
    ['Nanning', 22, 50, 'N', 108, 20, 'E'],
    ['Tokyo', 35, 40, 'N', 139, 40, 'E'],
    ['Osaka', 34, 40, 'N', 135, 30, 'E'],
    ['Kyoto', 35, 0, 'N', 135, 45, 'E'],
    ['Pechino', 39, 55, 'N', 116, 25, 'E'],
    ['Seul', 37, 35, 'N', 127, 0, 'E'],
    ['Shanghai', 31, 15, 'N', 121, 30, 'E'],
    ['Bangkok', 13, 45, 'N', 100, 30, 'E'],
    ['Mumbai', 19, 5, 'N', 72, 55, 'E'],
    ['Nuova Delhi', 28, 35, 'N', 77, 15, 'E'],
    ['New York', 40, 45, 'N', 74, 0, 'O'],
    ['Washington', 38, 55, 'N', 77, 0, 'O'],
    ['Filadelfia', 39, 55, 'N', 75, 10, 'O'],
    ['Boston', 42, 20, 'N', 71, 5, 'O'],
    ['Toronto', 43, 40, 'N', 79, 25, 'O'],
    ['Montr\u00e9al', 45, 30, 'N', 73, 35, 'O'],
    ['Chicago', 41, 55, 'N', 87, 40, 'O'],
    ['Los Angeles', 34, 5, 'N', 118, 15, 'O'],
    ['San Francisco', 37, 45, 'N', 122, 25, 'O'],
    ['Citt\u00e0 del Messico', 19, 25, 'N', 99, 10, 'O'],
    ['Buenos Aires', 34, 35, 'S', 58, 25, 'O'],
    ['Montevideo', 34, 55, 'S', 56, 10, 'O'],
    ['Rio de Janeiro', 22, 55, 'S', 43, 10, 'O'],
    ['San Paolo', 23, 35, 'S', 46, 40, 'O'],
    ['Santiago del Cile', 33, 25, 'S', 70, 40, 'O'],
    ['Lima', 12, 5, 'S', 77, 0, 'O'],
    ['Citt\u00e0 del Capo', 33, 55, 'S', 18, 25, 'E'],
    ['Johannesburg', 26, 10, 'S', 28, 5, 'E'],
    ['Durban', 29, 55, 'S', 31, 5, 'E'],
    ['Sydney', 33, 50, 'S', 151, 15, 'E'],
    ['Canberra', 35, 20, 'S', 149, 10, 'E'],
    ['Melbourne', 37, 50, 'S', 145, 0, 'E'],
    ['Brisbane', 27, 30, 'S', 153, 0, 'E'],
    ['Perth', 32, 0, 'S', 115, 55, 'E']
  ];
  var FRAZ = { 0: 'proprio sulla linea', 5: 'appena oltre la linea, a un dodicesimo', 10: 'a un sesto', 15: 'a un quarto',
    20: 'a un terzo', 25: 'poco prima della met\u00e0', 30: 'a met\u00e0', 35: 'poco oltre la met\u00e0',
    40: 'a due terzi', 45: 'a tre quarti', 50: 'a cinque sesti', 55: 'quasi alla linea successiva' };
  var PRIMI_PULITI = [10, 15, 20, 30, 40, 45, 50];

  function absLat(p) { return p.latG + p.latM / 60; }
  function absLon(p) { return p.lonG + p.lonM / 60; }
  function daCitta(c) { return { nome: c[0], latG: c[1], latM: c[2], lonG: c[4], lonM: c[5] }; }

  // Reticolo attorno ai luoghi, senza attraversare equatore o meridiano 0/180.
  function inquadra(r, luoghi, cols, rows) {
    var la = luoghi.map(absLat), lo = luoghi.map(absLon);
    var minA = Math.min.apply(null, la), maxA = Math.max.apply(null, la);
    var minO = Math.min.apply(null, lo), maxO = Math.max.apply(null, lo);
    var a1 = Math.max(1, Math.ceil(maxA + 0.3 - rows)), a2 = Math.min(88 - rows, Math.floor(minA - 0.3));
    var b1 = Math.max(1, Math.ceil(maxO + 0.3 - cols)), b2 = Math.min(179 - cols, Math.floor(minO - 0.3));
    if (a1 > a2 || b1 > b2) return null;
    return { a0: rint(r, a1, a2), b0: rint(r, b1, b2) };
  }

  function puntoCasuale(r, v, zero, altri) {
    for (var giri = 0; giri < 400; giri++) {
      var p = { nome: '', latG: rint(r, v.a0, v.a0 + v.rows - 1), latM: rpick(r, PRIMI_PULITI),
        lonG: rint(r, v.b0, v.b0 + v.cols - 1), lonM: rpick(r, PRIMI_PULITI) };
      if (zero === 'lat') p.latM = 0;
      if (zero === 'lon') p.lonM = 0;
      if (absLat(p) < v.a0 + 0.25 || absLat(p) > v.a0 + v.rows - 0.25) continue;
      if (absLon(p) < v.b0 + 0.25 || absLon(p) > v.b0 + v.cols - 0.25) continue;
      if (altri.every(function (q) { return Math.abs(absLat(q) - absLat(p)) + Math.abs(absLon(q) - absLon(p)) >= 1.8; })) return p;
    }
    return null;
  }

  // Serie graduata: i primi 5 a nord-est con due etichette per asse; poi emisferi sud/ovest,
  // una sola etichetta, e i primi "00" (esercizi 3 e 8).
  function varianteReticolo(r, i, cols, rows, usate) {
    var livello = i < 5 ? 0 : i < 10 ? 1 : 2;
    var zero = i === 2 ? 'lat' : i === 7 ? 'lon' : null;
    var trappola = false;   // l'errore di stampa visto in aula non fa parte dell'esercizio d'esame
    var conCitta = (i % 3) !== 1 && !zero;
    var emisferi = livello === 0 ? [['N', 'E']] : livello === 1 ? [['S', 'E'], ['N', 'O']] : [['S', 'O'], ['S', 'E'], ['N', 'O']];
    var em = rpick(r, emisferi);
    var v = { cols: cols, rows: rows, ns: em[0], eo: em[1], punti: [], citta: false };
    if (conCitta) {
      var cand = rmescola(r, CITTA.filter(function (c) { return c[3] === em[0] && c[6] === em[1] && !usate[c[0]]; }));
      for (var k = 0; k < cand.length && !v.punti.length; k++) {
        var c1 = daCitta(cand[k]);
        var amici = cand.filter(function (c) {
          var q = daCitta(c), dA = Math.abs(absLat(q) - absLat(c1)), dO = Math.abs(absLon(q) - absLon(c1));
          return q.nome !== c1.nome && dA <= rows - 0.7 && dO <= cols - 0.7 && dA + dO >= 1.8;
        });
        if (!amici.length) continue;
        var c2 = daCitta(rpick(r, amici));
        var box = inquadra(r, [c1, c2], cols, rows);
        if (box) { v.a0 = box.a0; v.b0 = box.b0; v.punti = [c1, c2]; v.citta = true; usate[c1.nome] = usate[c2.nome] = true; }
      }
    }
    if (!v.punti.length) {
      for (var tent = 0; tent < 20 && v.punti.length < 2; tent++) {
        v.a0 = rint(r, 3, 60); v.b0 = rint(r, 3, 168);
        var p1 = puntoCasuale(r, v, zero, []);
        var p2 = p1 && puntoCasuale(r, v, null, [p1]);
        if (p1 && p2) { var due = rmescola(r, IMMAGINARIE); p1.nome = due[0]; p2.nome = due[1]; v.punti = [p1, p2]; }
      }
    }
    var lineeLat = [], lineeLon = [];
    for (var a = 0; a <= rows; a++) lineeLat.push(v.a0 + a);
    for (var b = 0; b <= cols; b++) lineeLon.push(v.b0 + b);
    var quante = livello === 0 ? 2 : 1;
    v.labLat = rmescola(r, lineeLat).slice(0, quante).sort(function (x, y) { return x - y; });
    v.labLon = rmescola(r, lineeLon).slice(0, quante).sort(function (x, y) { return x - y; });
    v.trappola = null;
    if (trappola) {
      var asse = r() < 0.5 ? 'lon' : 'lat';
      var date = asse === 'lat' ? v.labLat : v.labLon, tutte = asse === 'lat' ? lineeLat : lineeLon;
      var libere = tutte.filter(function (x) { return date.every(function (d) { return Math.abs(d - x) >= 2; }); });
      if (libere.length) {
        var vera = rpick(r, libere), s = String(vera).split('').reverse().join(''), falsa = Number(s);
        var max = asse === 'lat' ? 89 : 180;
        if (falsa === vera || s[0] === '0' || falsa > max || Math.abs(falsa - vera) < 5) falsa = vera + (vera + 10 <= max ? 10 : -10);
        v.trappola = { asse: asse, vera: vera, falsa: falsa, trovata: false };
      }
    }
    return v;
  }

  function geometria(v, opz) {
    opz = opz || {};
    var CELL = opz.cella || (v.cols > 8 ? 52 : 64);
    var FS = opz.fs || (stretto() ? (v.cols > 8 ? 24 : 19) : 15);
    var SX = FS * 4.2, SY = 42;
    // se le etichette dei meridiani non stanno in una cella, si alternano su due righe
    var sfalsa = FS * 2.6 > CELL;
    var W = SX + v.cols * CELL + 22, H = SY + v.rows * CELL + 22 + FS * 2 + 14 + (sfalsa ? FS + 4 : 0);
    var g = { CELL: CELL, SX: SX, SY: SY, W: W, H: H, FS: FS, sfalsa: sfalsa,
      y: function (abs) { return v.ns === 'N' ? SY + (v.a0 + v.rows - abs) * CELL : SY + (abs - v.a0) * CELL; },
      x: function (abs) { return v.eo === 'E' ? SX + (abs - v.b0) * CELL : SX + (v.b0 + v.cols - abs) * CELL; } };
    g.gx0 = SX; g.gx1 = SX + v.cols * CELL; g.gy0 = SY; g.gy1 = SY + v.rows * CELL;
    return g;
  }
  function ordinaLuoghi(v) {
    var G = geometria(v);
    return v.punti.slice().sort(function (a, b) { return G.x(absLon(a)) - G.x(absLon(b)); });
  }

  // Disegna il reticolo. Ritorna { nodo, api }: l'api serve a tutorial, correzione e soluzione.
  function disegnaReticolo(v, opz) {
    opz = opz || {};
    var G = geometria(v, opz), FS = G.FS, stampa = !!opz.stampa;
    var svg = sv('svg', { viewBox: '0 0 ' + G.W + ' ' + G.H, role: 'img', width: opz.larghezza || null,
      'aria-label': 'Reticolo di paralleli e meridiani a un grado di distanza. Luoghi da localizzare: ' + v.punti.map(function (p) { return p.nome; }).join(' e ') + '.' });
    if (!stampa) {
      var defs = sv('defs');
      var f = sv('filter', { id: 'esx-grana', x: 0, y: 0, width: '100%', height: '100%' });
      f.appendChild(sv('feTurbulence', { type: 'fractalNoise', baseFrequency: '.9', numOctaves: '2' }));
      f.appendChild(sv('feColorMatrix', { type: 'matrix', values: '0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .2  0 0 0 .07 0' }));
      defs.appendChild(f); svg.appendChild(defs);
      svg.appendChild(sv('rect', { x: 0, y: 0, width: G.W, height: G.H, filter: 'url(#esx-grana)' }));
    }
    var sotto = sv('g'), base = sv('g'), sopra = sv('g'), luoghi = sv('g');
    svg.appendChild(sotto); svg.appendChild(base); svg.appendChild(sopra); svg.appendChild(luoghi);
    var tinta = stampa ? '#333' : '#5C4A36';
    base.appendChild(sv('rect', { x: G.gx0 - 5, y: G.gy0 - 5, width: G.gx1 - G.gx0 + 10, height: G.gy1 - G.gy0 + 10, fill: 'none', stroke: stampa ? '#666' : SEPPIA, 'stroke-width': 1 }));
    var lineeH = {}, lineeV = {};
    for (var i = 0; i <= v.rows; i++) {
      var val = v.ns === 'N' ? v.a0 + v.rows - i : v.a0 + i, y = G.gy0 + i * G.CELL;
      lineeH[val] = sv('line', { x1: G.gx0, y1: y, x2: G.gx1, y2: y, stroke: tinta, 'stroke-width': i === 0 || i === v.rows ? 1.5 : 1 });
      base.appendChild(lineeH[val]);
    }
    for (var j = 0; j <= v.cols; j++) {
      var valo = v.eo === 'E' ? v.b0 + j : v.b0 + v.cols - j, x = G.gx0 + j * G.CELL;
      lineeV[valo] = sv('line', { x1: x, y1: G.gy0, x2: x, y2: G.gy1, stroke: tinta, 'stroke-width': j === 0 || j === v.cols ? 1.5 : 1 });
      base.appendChild(lineeV[valo]);
    }
    function posLat(val) { return { x: G.SX - 10, y: G.y(val) + FS * 0.33 }; }
    function posLon(val) { return { x: G.x(val), y: G.gy1 + 12 + FS + (G.sfalsa && Math.abs(val - v.b0) % 2 ? FS + 4 : 0) }; }
    var etic = { lat: {}, lon: {} };
    v.labLat.forEach(function (val) {
      var p = posLat(val);
      etic.lat[val] = sv('text', { x: p.x, y: p.y, 'text-anchor': 'end', 'font-size': FS, 'font-style': 'italic' }, val + '\u00b0 ' + v.ns);
      base.appendChild(etic.lat[val]);
    });
    v.labLon.forEach(function (val) {
      var p = posLon(val);
      etic.lon[val] = sv('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'font-size': FS, 'font-style': 'italic' }, val + '\u00b0 ' + v.eo);
      base.appendChild(etic.lon[val]);
    });
    if (G.sfalsa) for (var jj = 0; jj <= v.cols; jj++) if (jj % 2) {
      var xv = G.gx0 + jj * G.CELL;
      base.appendChild(sv('line', { x1: xv, y1: G.gy1 + 6, x2: xv, y2: G.gy1 + 10 + FS, stroke: stampa ? '#999' : SEPPIA, 'stroke-width': .8, opacity: .6 }));
    }
    var trap = null;
    if (v.trappola) {
      var tr0 = v.trappola, pt = tr0.asse === 'lon' ? posLon(tr0.vera) : posLat(tr0.vera);
      trap = sv('g', { class: opz.interattivo ? 'esx-etic-trappola' : null, tabindex: opz.interattivo ? '0' : null, role: opz.interattivo ? 'button' : null,
        'aria-label': opz.interattivo ? 'Etichetta ' + tr0.falsa + ' gradi: toccala se \u00e8 sbagliata' : null });
      var lw = FS * 4;
      trap.appendChild(sv('rect', { x: tr0.asse === 'lon' ? pt.x - lw / 2 : pt.x - lw, y: pt.y - FS, width: lw, height: FS + 8, rx: 5, fill: 'transparent', stroke: 'transparent' }));
      trap.appendChild(sv('text', { x: pt.x, y: pt.y, 'text-anchor': tr0.asse === 'lon' ? 'middle' : 'end', 'font-size': FS, 'font-style': 'italic' }, tr0.falsa + '\u00b0 ' + (tr0.asse === 'lon' ? v.eo : v.ns)));
      base.appendChild(trap);
    }
    var nx = G.gx1 - 2;
    base.appendChild(sv('path', { d: 'M ' + nx + ' ' + (G.SY - 32) + ' l -6 15 l 6 -4 l 6 4 z', fill: tinta }));
    base.appendChild(sv('text', { x: nx - 12, y: G.SY - 19, 'text-anchor': 'end', 'font-size': Math.max(12, FS - 3), 'font-style': 'italic' }, 'nord'));
    var marker = [];
    v.punti.forEach(function (p) {
      var px = G.x(absLon(p)), py = G.y(absLat(p)), gg = sv('g');
      gg.appendChild(sv('circle', { cx: px, cy: py, r: 8, fill: 'none', stroke: stampa ? '#000' : INCH, 'stroke-width': 1.2 }));
      gg.appendChild(sv('circle', { cx: px, cy: py, r: 3.6, fill: stampa ? '#000' : INCH }));
      var aDestra = px < G.gx1 - FS * 7, sopraP = py - FS > G.gy0 + 4;
      gg.appendChild(sv('text', { x: px + (aDestra ? 12 : -12), y: sopraP ? py - 11 : py + FS + 8, 'text-anchor': aDestra ? 'start' : 'end',
        'font-size': FS - 1, 'font-weight': 700, stroke: stampa ? '#fff' : CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, p.nome));
      luoghi.appendChild(gg);
      marker.push({ p: p, x: px, y: py });
    });

    var api = {
      svg: svg, G: G, v: v,
      linee: function (tipo, anim, t) {
        var set = tipo === 'paralleli' ? lineeH : lineeV;
        Object.keys(set).forEach(function (k, idx) {
          var l = set[k].cloneNode();
          l.setAttribute('stroke', ORO); l.setAttribute('stroke-width', 3.4); l.setAttribute('opacity', '.9');
          sotto.appendChild(l); traccia(l, anim, t, 80 * idx, 500);
        });
      },
      evidenziaLuoghi: function (anim, t) {
        marker.forEach(function (m, idx) {
          var c = sv('circle', { cx: m.x, cy: m.y, r: 17, fill: 'rgba(200,169,110,.4)' });
          sotto.appendChild(c); appariDopo(c, anim, t, 150 + idx * 350);
        });
      },
      etichetta: function (asse, anim, t) {
        (asse === 'lat' ? v.labLat : v.labLon).forEach(function (val) {
          var p = asse === 'lat' ? posLat(val) : posLon(val);
          var cer = sv('ellipse', { cx: asse === 'lat' ? p.x - FS * 1.45 : p.x, cy: p.y - FS * 0.35, rx: asse === 'lat' ? FS * 1.9 : FS * 2.3, ry: FS * 0.95, fill: 'none', stroke: ORO, 'stroke-width': 2.6 });
          sopra.appendChild(cer); appariDopo(cer, anim, t, 50);
          var riga = (asse === 'lat' ? lineeH[val] : lineeV[val]).cloneNode();
          riga.setAttribute('stroke', ORO); riga.setAttribute('stroke-width', 3.4);
          sotto.appendChild(riga); traccia(riga, anim, t, 350, 800);
        });
      },
      trappola: function (anim, t) {
        if (!v.trappola) return;
        var tr = v.trappola, p = tr.asse === 'lon' ? posLon(tr.vera) : posLat(tr.vera), w2 = FS * 3.4;
        var x1 = tr.asse === 'lon' ? p.x - w2 / 2 : p.x - w2, x2 = tr.asse === 'lon' ? p.x + w2 / 2 : p.x;
        var barra = sv('line', { x1: x1, y1: p.y - FS * 0.35, x2: x2, y2: p.y - FS * 0.35, stroke: ROSSO, 'stroke-width': 2.6 });
        sopra.appendChild(barra); traccia(barra, anim, t, 100, 400);
        var giusto = tr.asse === 'lon'
          ? sv('text', { x: p.x, y: p.y + FS + 4, 'text-anchor': 'middle', 'font-size': FS, fill: BLU, 'font-style': 'italic', 'font-weight': 700 }, tr.vera + '\u00b0')
          : sv('text', { x: p.x, y: p.y - FS - 2, 'text-anchor': 'end', 'font-size': FS, fill: BLU, 'font-style': 'italic', 'font-weight': 700 }, tr.vera + '\u00b0');
        sopra.appendChild(giusto); appariDopo(giusto, anim, t, 550);
        tr.trovata = true;
      },
      valori: function (asse, anim, t) {
        var date = asse === 'lat' ? v.labLat : v.labLon;
        var n0 = asse === 'lat' ? v.a0 : v.b0, n1 = n0 + (asse === 'lat' ? v.rows : v.cols);
        var da = date.length ? date[0] : n0, tutte = [];
        for (var k = n0; k <= n1; k++) if (date.indexOf(k) < 0 && !(v.trappola && v.trappola.asse === asse && v.trappola.vera === k)) tutte.push(k);
        tutte.sort(function (a, b) { return Math.abs(a - da) - Math.abs(b - da) || a - b; });
        tutte.forEach(function (val, idx) {
          var p = asse === 'lat' ? posLat(val) : posLon(val);
          var n = sv('text', { x: p.x, y: p.y, 'text-anchor': asse === 'lat' ? 'end' : 'middle', 'font-size': FS - 1, fill: BLU, 'font-style': 'italic' }, val + '\u00b0');
          sopra.appendChild(n); appariDopo(n, anim, t, 150 + idx * 260);
        });
      },
      fascia: function (p, asse, anim, t) {
        var r, riga;
        if (asse === 'lat') {
          r = sv('rect', { x: G.gx0, y: Math.min(G.y(p.latG), G.y(p.latG + 1)), width: G.gx1 - G.gx0, height: G.CELL, fill: 'rgba(35,80,160,.10)' });
          riga = lineeH[p.latG].cloneNode();
        } else {
          r = sv('rect', { x: Math.min(G.x(p.lonG), G.x(p.lonG + 1)), y: G.gy0, width: G.CELL, height: G.gy1 - G.gy0, fill: 'rgba(35,80,160,.10)' });
          riga = lineeV[p.lonG].cloneNode();
        }
        riga.setAttribute('stroke', BLU); riga.setAttribute('stroke-width', 3.2);
        sotto.appendChild(r); sotto.appendChild(riga); appariDopo(r, anim, t, 50); traccia(riga, anim, t, 400, 700);
      },
      dividi: function (p, asse, parti, anim, t) {
        var x0 = Math.min(G.x(p.lonG), G.x(p.lonG + 1)), y0 = Math.min(G.y(p.latG), G.y(p.latG + 1)), C = G.CELL, fs = Math.max(11, FS - 4);
        var box = sv('rect', { x: x0, y: y0, width: C, height: C, fill: 'rgba(35,80,160,.07)', stroke: BLU, 'stroke-width': 1.3 });
        sotto.appendChild(box); appariDopo(box, anim, t, 30);
        for (var q = 1; q < parti; q++) {
          var min = q * 60 / parti, l, lab;
          if (asse === 'lat') {
            var yy = G.y(p.latG + min / 60);
            l = sv('line', { x1: x0, y1: yy, x2: x0 + C, y2: yy, stroke: BLU, 'stroke-width': 1, 'stroke-dasharray': '3 3' });
            lab = (parti <= 4 && C >= 60) ? sv('text', { x: x0 + C + 3, y: yy + fs * 0.35, 'font-size': fs, fill: BLU, stroke: CARTA, 'stroke-width': 3, 'paint-order': 'stroke' }, min + '\u2032') : null;
          } else {
            var xx = G.x(p.lonG + min / 60);
            l = sv('line', { x1: xx, y1: y0, x2: xx, y2: y0 + C, stroke: BLU, 'stroke-width': 1, 'stroke-dasharray': '3 3' });
            lab = (parti <= 4 && C >= 60) ? sv('text', { x: xx, y: y0 - 4, 'text-anchor': 'middle', 'font-size': fs, fill: BLU, stroke: CARTA, 'stroke-width': 3, 'paint-order': 'stroke' }, min + '\u2032') : null;
          }
          sopra.appendChild(l); traccia(l, anim, t, 150 + q * 220, 350);
          if (lab) { sopra.appendChild(lab); appariDopo(lab, anim, t, 250 + q * 220); }
        }
      },
      tratto: function (p, asse, anim, t) {
        var px = G.x(absLon(p)), py = G.y(absLat(p)), l, lab = null, fs = Math.max(12, FS - 2);
        var nomeADestra = px < G.gx1 - FS * 7, nomeSopra = py - FS > G.gy0 + 4;
        if (asse === 'lat') {
          var yG = G.y(p.latG);
          l = sv('line', { x1: px, y1: yG, x2: px, y2: py, stroke: BLU, 'stroke-width': 2.4 });
          if (p.latM) lab = sv('text', { x: nomeADestra ? px - 7 : px + 7, 'text-anchor': nomeADestra ? 'end' : 'start', y: (py + yG) / 2 + fs * 0.35, 'font-size': fs, fill: BLU, 'font-style': 'italic', 'font-weight': 700, stroke: CARTA, 'stroke-width': 3, 'paint-order': 'stroke' }, pad2(p.latM) + '\u2032');
        } else {
          var xG = G.x(p.lonG);
          l = sv('line', { x1: xG, y1: py, x2: px, y2: py, stroke: BLU, 'stroke-width': 2.4 });
          if (p.lonM) lab = sv('text', { x: (px + xG) / 2, y: nomeSopra ? py + fs + 3 : py - 6, 'text-anchor': 'middle', 'font-size': fs, fill: BLU, 'font-style': 'italic', 'font-weight': 700, stroke: CARTA, 'stroke-width': 3, 'paint-order': 'stroke' }, pad2(p.lonM) + '\u2032');
        }
        sopra.appendChild(l); traccia(l, anim, t, 60, 700);
        if (lab) { sopra.appendChild(lab); appariDopo(lab, anim, t, 700); }
      },
      cartellino: function (p, anim, t) {
        var m = marker.filter(function (x) { return x.p.nome === p.nome; })[0]; if (!m) return;
        var fs = Math.max(12, FS - 3), testo = coord(p.latG, p.latM, v.ns) + '  ' + coord(p.lonG, p.lonM, v.eo);
        var larg = testo.length * fs * 0.56 + 14;
        var cx = Math.max(G.gx0 + 2, Math.min(m.x - larg / 2, G.gx1 - larg - 2));
        var cy = m.y + FS + 16 + fs > G.gy1 ? m.y - FS - 22 - fs : m.y + FS + 12;
        var g = sv('g');
        g.appendChild(sv('rect', { x: cx, y: cy, width: larg, height: fs + 10, rx: 6, fill: '#fff', stroke: BLU, 'stroke-width': 1.3 }));
        g.appendChild(sv('text', { x: cx + larg / 2, y: cy + fs + 2, 'text-anchor': 'middle', 'font-size': fs, fill: BLU, 'font-weight': 700 }, testo));
        luoghi.appendChild(g); appariDopo(g, anim, t, 150);
      },
      soluzione: function (anim, t) {
        api.valori('lat', anim, t); api.valori('lon', anim, t);
        if (v.trappola && !v.trappola.trovata) api.trappola(anim, t);
        v.punti.forEach(function (p) {
          var x0 = Math.min(G.x(p.lonG), G.x(p.lonG + 1)), y0 = Math.min(G.y(p.latG), G.y(p.latG + 1));
          sotto.appendChild(sv('rect', { x: x0, y: y0, width: G.CELL, height: G.CELL, fill: 'rgba(35,80,160,.08)', stroke: BLU, 'stroke-width': 1.2 }));
          api.tratto(p, 'lat', anim, t); api.tratto(p, 'lon', anim, t); api.cartellino(p, anim, t);
        });
      }
    };
    if (trap && opz.interattivo) {
      var scovata = function () {
        if (v.trappola.trovata || trap.bloccata) return;
        api.trappola(true, Orologio());
        if (opz.suTrappola) opz.suTrappola();
      };
      trap.addEventListener('click', scovata);
      trap.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); scovata(); } });
      api.bloccaTrappola = function () { trap.bloccata = true; };
    }
    return { nodo: svg, api: api };
  }

  function partiPer(m) { return m === 0 ? 0 : m % 15 === 0 ? 4 : m % 20 === 0 ? 3 : m % 10 === 0 ? 6 : 12; }

  // L'orologio del docente: i primi come i minuti
  function quadrante(m, t) {
    var s = sv('svg', { viewBox: '0 0 200 236', role: 'img', 'aria-label': m + ' primi: come ' + m + ' minuti sull\u2019orologio' });
    s.appendChild(sv('circle', { cx: 100, cy: 100, r: 86, fill: '#fff', stroke: INCH, 'stroke-width': 3 }));
    var ang = m / 60 * 2 * Math.PI, x = 100 + 80 * Math.sin(ang), y = 100 - 80 * Math.cos(ang);
    var fetta = m ? sv('path', { d: 'M100 100 L100 20 A80 80 0 ' + (m > 30 ? 1 : 0) + ' 1 ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Z', fill: 'rgba(35,80,160,.22)' }) : null;
    if (fetta) s.appendChild(fetta);
    for (var k = 0; k < 60; k++) {
      var a = k / 60 * 2 * Math.PI, l = k % 5 === 0 ? 12 : 5;
      s.appendChild(sv('line', { x1: 100 + 86 * Math.sin(a), y1: 100 - 86 * Math.cos(a), x2: 100 + (86 - l) * Math.sin(a), y2: 100 - (86 - l) * Math.cos(a), stroke: INCH, 'stroke-width': k % 5 === 0 ? 2.4 : 1 }));
    }
    [[0, '0'], [15, '15'], [30, '30'], [45, '45']].forEach(function (q) {
      var a = q[0] / 60 * 2 * Math.PI;
      s.appendChild(sv('text', { x: 100 + 60 * Math.sin(a), y: 100 - 60 * Math.cos(a) + 7, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, q[1]));
    });
    s.appendChild(sv('line', { x1: 100, y1: 100, x2: 100 + 46 * Math.sin(ang), y2: 100 - 46 * Math.cos(ang), stroke: BLU, 'stroke-width': 6, 'stroke-linecap': 'round' }));
    s.appendChild(sv('circle', { cx: 100, cy: 100, r: 6, fill: BLU }));
    s.appendChild(sv('text', { x: 100, y: 224, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700, fill: BLU, 'font-family': 'Georgia,serif' }, m + ' primi'));
    if (fetta && t && !RIDUCI) { fetta.style.opacity = 0; fetta.style.transition = 'opacity .6s'; t.dopo(250, function () { fetta.style.opacity = 1; }); }
    return s;
  }

  var RETICOLO = {
    nomiErrori: {
      scambio: 'Scambiare latitudine e longitudine',
      dir: 'Sbagliare nord/sud o est/ovest',
      grado1: 'Prendere la linea successiva invece di quella con il valore pi\u00f9 basso',
      grado: 'Sbagliare il conto dei gradi partendo dall\u2019etichetta',
      primiVuoti: 'Dimenticare i primi (anche gli 00\u2032 vanno scritti)',
      primiOltre: 'Scrivere primi oltre 59',
      stima: 'Stimare male la frazione del riquadro'
    },
    opzioni: function () { return stretto() ? { cols: 6, rows: 5 } : { cols: 8, rows: 6 }; },
    opzioniStampa: function () { return { cols: 8, rows: 6 }; },
    serie: function (seme, n, opz) {
      var r = rngDa(seme), usate = {}, out = [];
      for (var i = 0; i < n; i++) out.push(varianteReticolo(r, i, opz.cols || 8, opz.rows || 6, usate));
      return out;
    },
    domanda: function (v0) {
      var v = JSON.parse(JSON.stringify(v0));         // copia: la trappola scovata si segna sulla copia
      var foglio = el('div'), campi = [];
      var trovataMsg = el('p', { class: 'esx-nota' });
      var d = disegnaReticolo(v, { interattivo: true, suTrappola: function () {
        trovataMsg.textContent = 'Esatto: quell\u2019etichetta rompeva la sequenza di un grado per linea. Il valore giusto \u00e8 ' + v.trappola.vera + '\u00b0.';
        trovataMsg.style.color = BLU;
      } });
      foglio.appendChild(el('h4', { text: 'Scrivi le coordinate dei due luoghi' }));
      foglio.appendChild(el('p', { class: 'esx-nota', style: 'margin:-6px 0 12px', text: v.citta ? 'Citt\u00e0 reali, con le loro coordinate vere arrotondate ai 5 primi.' : 'Citt\u00e0 immaginarie: i punti non corrispondono a luoghi reali.' }));
      ordinaLuoghi(v).forEach(function (p) {
        var blocco = el('div', { class: 'esx-luogo' }), c = {};
        blocco.appendChild(el('h5', { text: p.nome }));
        function riga(lab, k, opzioni) {
          c[k + 'G'] = el('input', { class: 'esx-campo', inputmode: 'numeric', 'aria-label': p.nome + ', ' + lab + ', gradi', autocomplete: 'off' });
          c[k + 'M'] = el('input', { class: 'esx-campo', inputmode: 'numeric', 'aria-label': p.nome + ', ' + lab + ', primi', autocomplete: 'off' });
          c[k + 'D'] = segmentato(opzioni, p.nome + ', ' + lab + ', direzione');
          c[k + 'X'] = el('span', { class: 'esx-giusto' });
          return el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: lab }), c[k + 'G'], el('span', { class: 'esx-unita', text: '\u00b0' }),
            c[k + 'M'], el('span', { class: 'esx-unita', text: '\u2032' }), c[k + 'D'], c[k + 'X']]);
        }
        blocco.appendChild(riga('Latitudine', 'lat', [{ t: 'Nord', v: 'N' }, { t: 'Sud', v: 'S' }]));
        blocco.appendChild(riga('Longitudine', 'lon', [{ t: 'Est', v: 'E' }, { t: 'Ovest', v: 'O' }]));
        campi.push({ p: p, c: c });
        foglio.appendChild(blocco);
      });
      return {
        nodo: d.nodo, foglio: foglio,
        leggi: function () {
          if (campi.every(function (x) { return !x.c.latG.value.trim() && !x.c.lonG.value.trim(); })) { campi[0].c.latG.focus(); return null; }
          return { trappola: !!(v.trappola && v.trappola.trovata), luoghi: campi.map(function (x) {
            return { latG: numero(x.c.latG.value), latM: x.c.latM.value.trim(), ns: x.c.latD.valore(),
              lonG: numero(x.c.lonG.value), lonM: x.c.lonM.value.trim(), eo: x.c.lonD.valore() };
          }) };
        },
        segna: function (val) {
          if (d.api.bloccaTrappola) d.api.bloccaTrappola();
          campi.forEach(function (x, i) {
            var s = val.campi[i];
            ['latG', 'latM', 'lonG', 'lonM'].forEach(function (k) { x.c[k].disabled = true; x.c[k].classList.add(s[k] ? 'ok' : 'ko'); });
            ['latD', 'lonD'].forEach(function (k) { x.c[k].blocca(); x.c[k].classList.add(s[k] ? 'ok' : 'ko'); });
            x.c.latX.textContent = s.latOk ? '' : coord(x.p.latG, x.p.latM, v.ns);
            x.c.lonX.textContent = s.lonOk ? '' : coord(x.p.lonG, x.p.lonM, v.eo);
          });
        },
        soluzione: function (anim) { d.api.soluzione(anim, Orologio()); }
      };
    },
    // Correzione. Tolleranza: 5 primi (la lettura è a occhio, come ha fatto il docente in aula).
    valuta: function (v, r) {
      var errori = [], visti = {}, campi = [], tuttoOk = true;
      function err(c, t) { if (!visti[t]) { errori.push({ c: c, t: t }); visti[t] = 1; } }
      ordinaLuoghi(v).forEach(function (p, i) {
        var u = r.luoghi[i], s = {};
        if (u.latG === p.lonG && u.lonG === p.latG && p.latG !== p.lonG) err('scambio', p.nome + ': hai scambiato latitudine e longitudine. La latitudine si legge sui paralleli, le linee orizzontali.');
        function uno(nome, gU, mU, dU, gV, mV, dV, k) {
          var mUn = numero(mU);
          s[k + 'D'] = dU === dV;
          if (!s[k + 'D']) err('dir', p.nome + ', ' + nome + ': \u00e8 ' + (k === 'lat' ? (dV === 'N' ? 'nord (i numeri crescono verso l\u2019alto)' : 'sud (i numeri crescono verso il basso)')
            : (dV === 'E' ? 'est (i numeri crescono verso destra)' : 'ovest (i numeri crescono verso sinistra)')) + '.');
          s[k + 'G'] = gU === gV;
          if (!s[k + 'G']) {
            if (Math.abs(gU - gV) === 1) err('grado1', p.nome + ', ' + nome + ': i gradi sono ' + gV + '. Tra le due linee attorno al luogo vale quella con il valore pi\u00f9 basso.');
            else err('grado', p.nome + ', ' + nome + ': i gradi sono ' + gV + '. Scrivi prima il valore di tutte le linee, partendo dall\u2019etichetta.');
          }
          if (mU === '') { s[k + 'M'] = false; err('primiVuoti', p.nome + ', ' + nome + ': mancano i primi. Si scrivono sempre, anche quando sono 00\u2032.'); }
          else if (isNaN(mUn) || mUn >= 60 || mUn < 0) { s[k + 'M'] = false; err('primiOltre', p.nome + ', ' + nome + ': i primi vanno da 0 a 59, come i minuti.'); }
          else {
            s[k + 'M'] = Math.abs(mUn - mV) <= 5;
            if (!s[k + 'M']) err('stima', p.nome + ', ' + nome + ': dalla linea del ' + gV + '\u00b0 il luogo sta ' + FRAZ[mV] + ' del riquadro, cio\u00e8 ' + pad2(mV) + '\u2032.');
          }
          s[k + 'Ok'] = s[k + 'D'] && s[k + 'G'] && s[k + 'M'];
          return s[k + 'Ok'];
        }
        var a = uno('latitudine', u.latG, u.latM, u.ns, p.latG, p.latM, v.ns, 'lat');
        var b = uno('longitudine', u.lonG, u.lonM, u.eo, p.lonG, p.lonM, v.eo, 'lon');
        if (!(a && b)) tuttoOk = false;
        campi.push(s);
      });
      if (v.trappola && !r.trappola) { tuttoOk = false; err('trappola', 'L\u2019etichetta ' + v.trappola.falsa + '\u00b0 era sbagliata: nella sequenza doveva esserci ' + v.trappola.vera + '\u00b0.'); }
      return { preso: tuttoOk, errori: errori, campi: campi,
        nota: (v.citta ? 'Sono le coordinate reali dei due luoghi, arrotondate ai 5 primi. ' : 'Le citt\u00e0 sono immaginarie: conta solo leggere bene il reticolo. ') + 'La correzione accetta 5\u2032 in pi\u00f9 o in meno: \u00e8 una stima a occhio.' };
    },
    procedimento: function (v0) {
      var v = JSON.parse(JSON.stringify(v0));
      if (v.trappola) v.trappola.trovata = false;
      function scena() { var vv = JSON.parse(JSON.stringify(v)); return disegnaReticolo(vv, {}); }
      var passi = [];
      if (v.trappola) passi.push({ scena: 's', titolo: 'L\u2019etichetta sbagliata', testo: 'Tra una linea e l\u2019altra il valore cambia di un grado. ' + v.trappola.falsa + '\u00b0 non sta nella sequenza: \u00e8 un errore di stampa, il valore giusto \u00e8 ' + v.trappola.vera + '\u00b0.',
        fai: function (a, an, t) { a.trappola(an, t); } });
      passi.push({ scena: 's', titolo: 'Scrivi i valori di tutte le linee', testo: 'Si parte dalle etichette date. ' +
        (v.ns === 'N' ? 'Siamo a nord: salendo i numeri crescono. ' : 'Siamo a sud: scendendo i numeri crescono. ') + (v.eo === 'E' ? 'Siamo a est: verso destra crescono.' : 'Siamo a ovest: verso sinistra crescono.'),
        regola: 'Prima tutti i valori: cos\u00ec non si sbaglia il verso.', fai: function (a, an, t) { a.valori('lat', an, t); a.valori('lon', an, t); } });
      ordinaLuoghi(v).forEach(function (p0) {
        function p(a) { return a.v.punti.filter(function (x) { return x.nome === p0.nome; })[0]; }
        passi.push({ scena: 's', titolo: p0.nome + ': latitudine', testo: p0.nome + ' sta tra i paralleli ' + p0.latG + '\u00b0 e ' + (p0.latG + 1) + '\u00b0 ' + v.ns + '. Vale la linea con il valore pi\u00f9 basso: ' + p0.latG + '\u00b0. ' +
          (p0.latM === 0 ? 'E ci sta proprio sopra: 00\u2032.' : 'Dalla linea, il luogo sta ' + FRAZ[p0.latM] + ' del riquadro: ' + pad2(p0.latM) + '\u2032.'),
          regola: 'Latitudine: ' + coord(p0.latG, p0.latM, v.ns), extra: function (t) { return quadrante(p0.latM, t); },
          fai: function (a, an, t) { var q = p(a); a.fascia(q, 'lat', an, t); var n = partiPer(q.latM); if (n) a.dividi(q, 'lat', n, an, t); a.tratto(q, 'lat', an, t); } });
        passi.push({ scena: 's', titolo: p0.nome + ': longitudine', testo: 'Tra i meridiani ' + p0.lonG + '\u00b0 e ' + (p0.lonG + 1) + '\u00b0 ' + v.eo + ': si parte da ' + p0.lonG + '\u00b0. ' +
          (p0.lonM === 0 ? 'Il luogo sta proprio sulla linea: 00\u2032.' : 'Il luogo sta ' + FRAZ[p0.lonM] + ' del riquadro: ' + pad2(p0.lonM) + '\u2032.'),
          regola: 'Longitudine: ' + coord(p0.lonG, p0.lonM, v.eo), extra: function (t) { return quadrante(p0.lonM, t); },
          fai: function (a, an, t) { var q = p(a); a.fascia(q, 'lon', an, t); var n = partiPer(q.lonM); if (n) a.dividi(q, 'lon', n, an, t); a.tratto(q, 'lon', an, t); a.cartellino(q, an, t); } });
      });
      return { scena: scena, passi: passi };
    },
    // Il tutorial: l'esempio svolto in aula, Hanoi e Hong Kong.
    tutorial: function (e) {
      var aula = { cols: 11, rows: 6, a0: 18, b0: 104, ns: 'N', eo: 'E', labLat: [20], labLon: [105], citta: true, trappola: null,
        punti: [{ nome: 'Hanoi', latG: 21, latM: 0, lonG: 105, lonM: 50 }, { nome: 'Hong Kong', latG: 22, latM: 15, lonG: 114, lonM: 10 }] };
      var sud = { cols: 6, rows: 4, a0: 32, b0: 55, ns: 'S', eo: 'O', labLat: [34], labLon: [57], citta: true, trappola: null,
        punti: [{ nome: 'Buenos Aires', latG: 34, latM: 35, lonG: 58, lonM: 25 }, { nome: 'Montevideo', latG: 34, latM: 55, lonG: 56, lonM: 10 }] };
      var scene = { aula: aula, sud: sud };
      function scena(nome, opz) { return disegnaReticolo(JSON.parse(JSON.stringify(scene[nome])), opz || {}); }
      function ha(a) { return a.v.punti[0]; }
      function hk(a) { return a.v.punti[1]; }
      var passi = [
        { scena: 'aula', stampa: 'testo', momentaneo: true, titolo: 'L\u2019esercizio numero uno della prova', testo: ['All\u2019esame trovi un reticolo come questo: linee orizzontali e verticali, a un grado l\u2019una dall\u2019altra, e dei luoghi da localizzare. \u00c8 il reticolo visto in aula, con Hanoi e Hong Kong nei punti in cui li ha letti il docente.', 'Cambieranno i numeri, non il metodo.'],
          fai: function (a, an, t) { a.evidenziaLuoghi(an, t); } },
        { scena: 'aula', stampa: 'testo', momentaneo: true, titolo: 'I paralleli danno la latitudine', testo: 'Le linee orizzontali sono i paralleli. Dicono quanto un luogo \u00e8 a nord o a sud dell\u2019equatore: \u00e8 la latitudine.',
          fai: function (a, an, t) { a.linee('paralleli', an, t); } },
        { scena: 'aula', stampa: 'testo', momentaneo: true, titolo: 'I meridiani danno la longitudine', testo: 'Le linee verticali sono i meridiani. Dicono quanto un luogo \u00e8 a est o a ovest del meridiano di Greenwich: \u00e8 la longitudine.',
          fai: function (a, an, t) { a.linee('meridiani', an, t); } },
        { scena: 'aula', stampa: true, momentaneo: true, titolo: 'Che cosa vuol dire \u00ab20\u00b0 N\u00bb', testo: ['Non vuol dire che il nord \u00e8 a sinistra. Il nord \u00e8 sempre in alto, e il foglio non si gira.', 'Vuol dire che ogni punto di quella linea sta 20 gradi a nord dell\u2019equatore. Allo stesso modo, ogni punto del meridiano \u00ab105\u00b0 E\u00bb sta 105 gradi a est di Greenwich.'],
          regola: 'L\u2019etichetta \u00e8 il valore di tutta la linea, non una direzione del foglio.', fai: function (a, an, t) { a.etichetta('lat', an, t); a.etichetta('lon', an, t); } },
        { scena: 'aula', stampa: true, titolo: 'Primo passo: scrivi tutti i valori', testo: ['Il trucco del docente: prima di tutto scrivi il valore di ogni linea, partendo dalle etichette.', 'Siamo a nord: salendo i numeri crescono, 21, 22, 23, 24; scendendo 19, 18. Siamo a est: verso destra crescono, 106, 107 e via di seguito.'],
          regola: 'Scrivi i valori di tutte le linee: cos\u00ec non sbagli il verso in cui crescono.', fai: function (a, an, t) { a.valori('lat', an, t); a.valori('lon', an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Hanoi: latitudine', testo: ['Hanoi sta proprio sul parallelo dei 21\u00b0. Latitudine: 21\u00b000\u2032 N.', 'Gli 00 si scrivono sempre: senza, indichi un\u2019area, come a battaglia navale, e non un punto.'],
          regola: 'Gradi e primi, sempre: 21\u00b000\u2032.', extra: function (t) { return quadrante(0, t); }, fai: function (a, an, t) { a.fascia(ha(a), 'lat', an, t); } },
        { scena: 'aula', stampa: true, titolo: 'Hanoi: longitudine', testo: ['Hanoi sta tra i meridiani 105\u00b0 e 106\u00b0: si parte dalla linea con il valore pi\u00f9 basso, 105\u00b0.', 'Un grado sono 60 primi, come un\u2019ora sono 60 minuti. Dividiamo il riquadro in sesti, 10 primi ciascuno: Hanoi \u00e8 a cinque sesti, cio\u00e8 50\u2032. Longitudine: 105\u00b050\u2032 E.'],
          extra: function (t) { return quadrante(50, t); }, fai: function (a, an, t) { a.fascia(ha(a), 'lon', an, t); a.dividi(ha(a), 'lon', 6, an, t); a.tratto(ha(a), 'lon', an, t); } },
        { scena: 'aula', stampa: true, titolo: 'Hong Kong: latitudine', testo: ['Hong Kong sta tra i paralleli 22\u00b0 e 23\u00b0: si parte da 22\u00b0.', 'Dividiamo il riquadro in quarti, come i quarti d\u2019ora: 15, 30, 45. Hong Kong \u00e8 a un quarto sopra la linea: 22\u00b015\u2032 N.'],
          extra: function (t) { return quadrante(15, t); }, regola: 'Met\u00e0 = 30\u2032, un quarto = 15\u2032, tre quarti = 45\u2032, un terzo = 20\u2032, due terzi = 40\u2032.',
          fai: function (a, an, t) { a.fascia(hk(a), 'lat', an, t); a.dividi(hk(a), 'lat', 4, an, t); a.tratto(hk(a), 'lat', an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Hong Kong: longitudine', testo: 'Tra i meridiani 114\u00b0 e 115\u00b0, poco dopo la linea del 114\u00b0: un sesto del riquadro, cio\u00e8 10\u2032. Longitudine: 114\u00b010\u2032 E.',
          extra: function (t) { return quadrante(10, t); }, fai: function (a, an, t) { a.fascia(hk(a), 'lon', an, t); a.dividi(hk(a), 'lon', 6, an, t); a.tratto(hk(a), 'lon', an, t); } },
        { scena: 'aula', stampa: true, titolo: 'Le risposte', testo: ['Hanoi: 21\u00b000\u2032 N, 105\u00b050\u2032 E.', 'Hong Kong: 22\u00b015\u2032 N, 114\u00b010\u2032 E.', 'Il cerchietto \u00b0 indica i gradi, l\u2019apice \u2032 i primi. Ci si ferma ai primi.'],
          fai: function (a, an, t) { a.cartellino(ha(a), an, t); a.cartellino(hk(a), an, t); } },
        { scena: 'sud', stampa: 'testo', titolo: 'E se siamo a sud o a ovest?', testo: ['Stesso metodo, ma i numeri crescono nell\u2019altro verso: a sud scendendo, a ovest verso sinistra.', 'Per questo si scrivono prima tutti i valori. Il grado resta quello della linea con il valore pi\u00f9 basso.'],
          fai: function (a, an, t) { a.valori('lat', an, t); a.valori('lon', an, t); } },
        { scena: 'sud', stampa: true, titolo: 'Buenos Aires', testo: ['Tra 34\u00b0 e 35\u00b0 S: si parte da 34\u00b0, e scendendo il luogo \u00e8 poco oltre la met\u00e0, 35\u2032.', 'Tra 58\u00b0 e 59\u00b0 O: si parte da 58\u00b0, e verso sinistra \u00e8 poco prima della met\u00e0, 25\u2032.', 'Risposta: 34\u00b035\u2032 S, 58\u00b025\u2032 O.'],
          fai: function (a, an, t) { var p = a.v.punti[0]; a.fascia(p, 'lat', an, t); a.tratto(p, 'lat', an, t); a.fascia(p, 'lon', an, t); a.tratto(p, 'lon', an, t); a.cartellino(p, an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Scrivi i valori di tutte le linee. 2. Per ogni luogo prendi la linea con il valore pi\u00f9 basso. 3. Stima i primi come sull\u2019orologio. 4. Scrivi gradi, primi e direzione: N o S, E o O.', 'Ora prova tu: 15 reticoli sempre diversi.'],
          dopo: function () { return docente(e); }, fai: function (a, an, t) { a.soluzione(false, t); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni reticolo scrivi latitudine e longitudine dei due luoghi in gradi e primi, con la direzione (N o S, E o O). Il nord \u00e8 in alto; tra una linea e l\u2019altra c\u2019\u00e8 un grado.</p>',
    stampa: function (v, n) {
      var d = disegnaReticolo(v, { stampa: true, fs: 16, larghezza: '90mm' });
      var risp = ordinaLuoghi(v).map(function (p) {
        return '<div><b>' + esc(p.nome) + '</b><br>Lat. _____\u00b0 _____\u2032 ____<br>Long. _____\u00b0 _____\u2032 ____</div>';
      }).join('<div style="height:8px"></div>');
      return '<h3>' + n + '.</h3><div class="riga">' + d.nodo.outerHTML + '<div class="risp">' + risp + '</div></div>';
    },
    soluzioni: function (vs) {
      return '<table><tr><th>N.</th><th>Primo luogo</th><th>Secondo luogo</th><th>Nota</th></tr>' + vs.map(function (v, i) {
        return '<tr><td>' + (i + 1) + '</td>' + ordinaLuoghi(v).map(function (p) {
          return '<td><b>' + esc(p.nome) + '</b>: ' + coord(p.latG, p.latM, v.ns) + ', ' + coord(p.lonG, p.lonM, v.eo) + '</td>';
        }).join('') + '<td>' + (v.trappola ? 'Etichetta ' + v.trappola.falsa + '\u00b0: era ' + v.trappola.vera + '\u00b0' : '') + '</td></tr>';
      }).join('') + '</table><p style="font-size:9.5pt">Si accettano 5\u2032 in pi\u00f9 o in meno: \u00e8 una stima a occhio.</p>';
    }
  };

  /* =================================================================
     2. DENSITÀ E DISTRIBUZIONE DEL POPOLAMENTO
     Dalla lezione 2: due quadrati di lato noto, pallini = abitanti.
     Area = lato × lato (non il perimetro!), densità = abitanti / area
     (il soggetto al numeratore), stessa densità ma distribuzione sparsa
     o accentrata, il perché, e la metà disabitata oltre la diagonale.
     ================================================================= */
  var CAUSE = {
    accentrata: { giuste: ['L\u2019acqua c\u2019\u00e8 solo in un punto: un pozzo o una sorgente.',
                           'Stare vicini, dentro le mura, d\u00e0 sicurezza.',
                           'Terra fertile e strade ci sono solo in una parte del territorio.'],
                  domanda: function (q) { return 'Perch\u00e9 in ' + q + ' si vive tutti vicini? Scegli le ipotesi sensate.'; } },
    sparsa: { giuste: ['L\u2019acqua si trova un po\u2019 dappertutto.', 'La terra \u00e8 fertile su tutto il territorio.',
                       'Le strade raggiungono ogni casa.', 'Il territorio \u00e8 sicuro: si pu\u00f2 vivere isolati.'],
              domanda: function (q) { return 'Che cosa permette di vivere sparsi in ' + q + '? Scegli le ipotesi sensate.'; } },
    sbagliate: ['\u00c8 casuale: si sono sistemati a caso.', 'Nel quadrato accentrato la densit\u00e0 \u00e8 pi\u00f9 alta.',
                'Nel quadrato sparso abitano pi\u00f9 persone.', 'Il quadrato accentrato \u00e8 pi\u00f9 piccolo.']
  };
  var LATI = [1, 1, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1];
  var META = { 3: 1, 6: 1, 9: 1, 12: 1, 14: 1 };

  function lontano(p, lista, min) { return lista.every(function (q) { var dx = p[0] - q[0], dy = p[1] - q[1]; return dx * dx + dy * dy >= min * min; }); }
  function puntiSparsi(r, N) {
    var k = Math.ceil(Math.sqrt(N)), celle = [];
    for (var i = 0; i < k; i++) for (var j = 0; j < k; j++) celle.push([i, j]);
    return rmescola(r, celle).slice(0, N).map(function (c) {
      return [(c[0] + 0.5 + (r() - 0.5) * 0.5) / k, (c[1] + 0.5 + (r() - 0.5) * 0.5) / k];
    });
  }
  function puntiAccentrati(r, N, c, meta) {
    var migliore = [];
    for (var tentativo = 0; tentativo < 8; tentativo++) {
      var out = [], giri = 0, sigma = 0.06 + N * 0.0025 + tentativo * 0.012;
      while (out.length < N && giri < 30000) {
        giri++;
        var u = r() || 1e-9, w = r(), rr = sigma * Math.sqrt(-2 * Math.log(u)), a = 2 * Math.PI * w;
        var p = [c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a)];
        if (p[0] < 0.06 || p[0] > 0.94 || p[1] < 0.06 || p[1] > 0.94) continue;
        if (meta && p[0] + p[1] > 0.9) continue;
        if (!lontano(p, out, 0.05)) continue;
        out.push(p);
      }
      if (out.length === N) return out;
      if (out.length > migliore.length) migliore = out;
    }
    return migliore;
  }
  function varianteDensita(r, i) {
    var L = LATI[i % LATI.length];
    var d = L === 1 ? rint(r, 5, 12) : L === 2 ? rint(r, 2, 4) : 2;
    var N = d * L * L, meta = !!META[i];
    var centro = meta ? [0.3, 0.3] : [0.3 + r() * 0.4, 0.3 + r() * 0.4];
    var v = { L: L, d: d, N: N, meta: meta, pozzo: r() < 0.5, sparsaA: r() < 0.5, centro: centro };
    v.pSparsa = puntiSparsi(r, N);
    v.pAccentrata = puntiAccentrati(r, N, centro, meta);
    v.focus = r() < 0.5 ? 'accentrata' : 'sparsa';
    var giuste = rmescola(r, CAUSE[v.focus].giuste).slice(0, 3), sbagliate = rmescola(r, CAUSE.sbagliate).slice(0, 3);
    v.opzioni = rmescola(r, giuste.map(function (t) { return { t: t, g: true }; }).concat(sbagliate.map(function (t) { return { t: t, g: false }; })));
    return v;
  }
  function nomi(v) { return v.sparsaA ? { sparsa: 'A', accentrata: 'B' } : { sparsa: 'B', accentrata: 'A' }; }

  function disegnaDensita(v, opz) {
    opz = opz || {};
    var stampa = !!opz.stampa, S = 230, M = 30, GAP = 40, FS = opz.fs || (stretto() ? 19 : 16);
    var W = M * 2 + S * 2 + GAP, H = M + S + 34 + FS * 4.6;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', width: opz.larghezza || null,
      'aria-label': 'Due quadrati, A e B, di lato ' + v.L + ' chilometri, ciascuno con ' + v.N + ' pallini: ogni pallino \u00e8 un abitante.' });
    var sotto = sv('g'), base = sv('g'), sopra = sv('g');
    svg.appendChild(sotto); svg.appendChild(base); svg.appendChild(sopra);
    var inch = stampa ? '#000' : INCH, q = {};
    ['A', 'B'].forEach(function (nome, idx) {
      var x0 = M + idx * (S + GAP), y0 = M;
      var accentrato = (nome === 'A') !== v.sparsaA;
      var punti = accentrato ? v.pAccentrata : v.pSparsa;
      q[nome] = { x0: x0, y0: y0, punti: punti, accentrato: accentrato };
      base.appendChild(sv('rect', { x: x0, y: y0, width: S, height: S, fill: stampa ? '#fff' : 'rgba(255,255,255,.4)', stroke: inch, 'stroke-width': 1.6 }));
      for (var k = 1; k < v.L; k++) {
        base.appendChild(sv('line', { x1: x0 + k * S / v.L, y1: y0, x2: x0 + k * S / v.L, y2: y0 + S, stroke: stampa ? '#888' : SEPPIA, 'stroke-width': .7, 'stroke-dasharray': '2 5' }));
        base.appendChild(sv('line', { x1: x0, y1: y0 + k * S / v.L, x2: x0 + S, y2: y0 + k * S / v.L, stroke: stampa ? '#888' : SEPPIA, 'stroke-width': .7, 'stroke-dasharray': '2 5' }));
      }
      if (accentrato && v.meta) base.appendChild(sv('line', { x1: x0 + S, y1: y0, x2: x0, y2: y0 + S, stroke: stampa ? '#555' : SEPPIA, 'stroke-width': 1, 'stroke-dasharray': '6 5' }));
      if (accentrato && v.pozzo) {
        var cx = x0 + v.centro[0] * S, cy = y0 + v.centro[1] * S;
        base.appendChild(sv('circle', { cx: cx, cy: cy, r: 7, fill: 'none', stroke: stampa ? '#444' : '#2B5E8C', 'stroke-width': 1.6 }));
        base.appendChild(sv('circle', { cx: cx, cy: cy, r: 2.5, fill: stampa ? '#444' : '#2B5E8C' }));
      }
      punti.forEach(function (p) { base.appendChild(sv('circle', { cx: x0 + p[0] * S, cy: y0 + p[1] * S, r: 3.8, fill: inch })); });
      base.appendChild(sv('text', { x: x0, y: y0 - 10, 'font-size': FS + 2, 'font-weight': 700 }, nome));
      var yb = y0 + S + 16;
      base.appendChild(sv('line', { x1: x0, y1: yb, x2: x0 + S, y2: yb, stroke: inch }));
      base.appendChild(sv('line', { x1: x0, y1: yb - 5, x2: x0, y2: yb + 5, stroke: inch }));
      base.appendChild(sv('line', { x1: x0 + S, y1: yb - 5, x2: x0 + S, y2: yb + 5, stroke: inch }));
      base.appendChild(sv('text', { x: x0 + S / 2, y: yb + FS + 4, 'text-anchor': 'middle', 'font-size': FS, 'font-style': 'italic' }, 'lato ' + v.L + ' km'));
    });
    function passoConta(n) { return n > 12 ? 90 : 160; }
    var api = {
      v: v,
      lati: function (anim, t) {
        ['A', 'B'].forEach(function (n, i) {
          var l = sv('line', { x1: q[n].x0, y1: q[n].y0 + S + 16, x2: q[n].x0 + S, y2: q[n].y0 + S + 16, stroke: ORO, 'stroke-width': 6, opacity: .85 });
          sotto.appendChild(l); traccia(l, anim, t, 100 + i * 300, 600);
        });
      },
      conta: function (nome, anim, t) {
        var Q = q[nome], ord = Q.punti.slice().sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; }), dt = passoConta(Q.punti.length);
        ord.forEach(function (p, k) {
          var n = sv('text', { x: Q.x0 + p[0] * S + 6, y: Q.y0 + p[1] * S - 5, 'font-size': 12, fill: BLU, 'font-weight': 700, stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }, String(k + 1));
          sopra.appendChild(n); appariDopo(n, anim, t, 100 + k * dt);
        });
        var tag = sv('text', { x: Q.x0 + S, y: Q.y0 - 10, 'text-anchor': 'end', 'font-size': FS, fill: BLU, 'font-weight': 700 }, Q.punti.length + ' abitanti');
        sopra.appendChild(tag); appariDopo(tag, anim, t, 150 + Q.punti.length * dt);
      },
      celle: function (nome, anim, t) {
        var Q = q[nome], c = S / v.L, k = 0;
        for (var i = 0; i < v.L; i++) for (var j = 0; j < v.L; j++) {
          k++;
          var rr = sv('rect', { x: Q.x0 + j * c + 3, y: Q.y0 + i * c + 3, width: c - 6, height: c - 6, fill: 'rgba(200,169,110,.3)', stroke: ORO, 'stroke-width': 1.2 });
          var n = sv('text', { x: Q.x0 + j * c + c / 2, y: Q.y0 + i * c + c / 2 + 8, 'text-anchor': 'middle', 'font-size': 24, fill: SEPPIA, 'font-weight': 700 }, String(k));
          sotto.appendChild(rr); sopra.appendChild(n); appariDopo(rr, anim, t, 100 + k * 380); appariDopo(n, anim, t, 150 + k * 380);
        }
        var tot = sv('text', { x: Q.x0 + S / 2, y: Q.y0 + S + 16 + FS * 2 + 12, 'text-anchor': 'middle', 'font-size': FS, fill: SEPPIA, 'font-weight': 700 },
          v.L + ' \u00d7 ' + v.L + ' = ' + v.L * v.L + ' km\u00b2');
        sopra.appendChild(tot); appariDopo(tot, anim, t, 250 + k * 380);
      },
      perimetro: function (nome, anim, t) {
        var Q = q[nome];
        var p = sv('rect', { x: Q.x0, y: Q.y0, width: S, height: S, fill: 'none', stroke: ROSSO, 'stroke-width': 4, 'stroke-dasharray': '10 6' });
        sopra.appendChild(p); appariDopo(p, anim, t, 100);
        [[v.L + ' + ' + v.L + ' + ' + v.L + ' + ' + v.L + ' = ' + 4 * v.L, -4], ['\u00e8 il bordo, non l\u2019area', 20]].forEach(function (riga, i) {
          var x = sv('text', { x: Q.x0 + S / 2, y: Q.y0 + S / 2 + riga[1], 'text-anchor': 'middle', 'font-size': i ? 16 : 20, fill: ROSSO, 'font-weight': 700, stroke: '#fff', 'stroke-width': 5, 'paint-order': 'stroke' }, riga[0]);
          sopra.appendChild(x); appariDopo(x, anim, t, 500 + i * 300);
        });
      },
      densita: function (nome, anim, t) {
        var Q = q[nome];
        var tag = sv('text', { x: Q.x0 + S / 2, y: Q.y0 + S + 16 + FS * 2 + 12, 'text-anchor': 'middle', 'font-size': FS, fill: BLU, 'font-weight': 700 },
          Q.punti.length + ' \u00f7 ' + v.L * v.L + ' = ' + v.d + ' ab/km\u00b2');
        sopra.appendChild(tag); appariDopo(tag, anim, t, 150);
      },
      distribuzione: function (anim, t) {
        ['A', 'B'].forEach(function (n, i) {
          var Q = q[n], col = Q.accentrato ? ROSSO : BLU;
          var rr = sv('rect', { x: Q.x0 - 4, y: Q.y0 - 4, width: S + 8, height: S + 8, fill: 'none', stroke: col, 'stroke-width': 2.6, rx: 4 });
          var tx = sv('text', { x: Q.x0 + S / 2, y: Q.y0 + S + 16 + FS * 3.6 + 12, 'text-anchor': 'middle', 'font-size': FS + 4, fill: col, 'font-weight': 700 },
            Q.accentrato ? 'accentrata' : 'sparsa');
          sopra.appendChild(rr); sopra.appendChild(tx); appariDopo(rr, anim, t, 100 + i * 500); appariDopo(tx, anim, t, 300 + i * 500);
        });
      },
      meta: function (anim, t) {
        var Q = q[nomi(v).accentrata];
        var tri = sv('path', { d: 'M ' + (Q.x0 + S) + ' ' + Q.y0 + ' L ' + (Q.x0 + S) + ' ' + (Q.y0 + S) + ' L ' + Q.x0 + ' ' + (Q.y0 + S) + ' Z', fill: 'rgba(90,80,70,.22)' });
        var tx = sv('text', { x: Q.x0 + S * 0.72, y: Q.y0 + S * 0.8, 'text-anchor': 'middle', 'font-size': 15, fill: INCH, 'font-weight': 700 }, '0 abitanti');
        sotto.appendChild(tri); sopra.appendChild(tx); appariDopo(tri, anim, t, 100); appariDopo(tx, anim, t, 500);
      },
      soluzione: function (anim, t) {
        api.conta('A', false, t); api.conta('B', false, t); api.densita('A', false, t); api.densita('B', false, t); api.distribuzione(false, t);
        if (v.meta) api.meta(false, t);
      }
    };
    return { nodo: svg, api: api };
  }

  // formula grande per la lavagna
  function formula(sopra, sotto, risultato) {
    var s = sv('svg', { viewBox: '0 0 280 110', role: 'img', 'aria-label': sopra + ' diviso ' + sotto + ' uguale ' + risultato });
    s.appendChild(sv('text', { x: 60, y: 40, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, sopra));
    s.appendChild(sv('line', { x1: 15, y1: 52, x2: 105, y2: 52, stroke: INCH, 'stroke-width': 2.5 }));
    s.appendChild(sv('text', { x: 60, y: 86, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, sotto));
    s.appendChild(sv('text', { x: 195, y: 62, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: BLU, 'font-family': 'Georgia,serif' }, '= ' + risultato));
    return s;
  }

  var DENSITA = {
    nomiErrori: {
      conta: 'Contare male gli abitanti', perimetro: 'Calcolare il perimetro invece dell\u2019area', lati: 'Sommare i lati',
      lato: 'Usare il lato al posto dell\u2019area', area: 'Sbagliare l\u2019area', invertita: 'Mettere l\u2019area al numeratore',
      perPerimetro: 'Dividere per il perimetro', perLato: 'Dividere per il lato', nonDiviso: 'Dimenticare di dividere per l\u2019area',
      densita: 'Sbagliare la densit\u00e0', diverse: 'Credere che la densit\u00e0 di B sia diversa', distr: 'Confondere sparsa e accentrata',
      meta: 'Dividere per tutta l\u2019area invece che per la parte abitata', perche: 'Scegliere ipotesi che non spiegano la distribuzione',
      casuale: 'Dire \u00ab\u00e8 casuale\u00bb: in geografia niente lo \u00e8'
    },
    serie: function (seme, n) { var r = rngDa(seme), out = []; for (var i = 0; i < n; i++) out.push(varianteDensita(r, i)); return out; },
    domanda: function (v) {
      var d = disegnaDensita(v, {}), nm = nomi(v), foglio = el('div'), c = {};
      foglio.appendChild(el('h4', { text: 'Ogni pallino \u00e8 un abitante. Rispondi:' }));
      function campo(k, lab, unita) {
        c[k] = el('input', { class: 'esx-campo largo', inputmode: 'decimal', 'aria-label': lab, autocomplete: 'off' });
        c[k + 'X'] = el('span', { class: 'esx-giusto' });
        return el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: lab }), c[k], unita ? el('span', { class: 'esx-unita', text: unita }) : null, c[k + 'X']]);
      }
      foglio.appendChild(campo('abit', 'Abitanti in A', 'ab'));
      foglio.appendChild(campo('area', 'Area di un quadrato', 'km\u00b2'));
      foglio.appendChild(campo('dA', 'Densit\u00e0 di A', 'ab/km\u00b2'));
      foglio.appendChild(campo('dB', 'Densit\u00e0 di B', 'ab/km\u00b2'));
      c.distA = segmentato([{ t: 'Sparsa', v: 'sparsa' }, { t: 'Accentrata', v: 'accentrata' }], 'Distribuzione in A');
      c.distB = segmentato([{ t: 'Sparsa', v: 'sparsa' }, { t: 'Accentrata', v: 'accentrata' }], 'Distribuzione in B');
      c.distX = el('span', { class: 'esx-giusto' });
      foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'Distribuzione in A' }), c.distA]));
      foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'Distribuzione in B' }), c.distB, c.distX]));
      if (v.meta) foglio.appendChild(campo('meta', 'Densit\u00e0 della sola parte abitata di ' + nm.accentrata, 'ab/km\u00b2'));
      foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:12px 0 4px;line-height:1.4', text: CAUSE[v.focus].domanda(nm[v.focus]) }));
      var chips = el('div', { class: 'esx-chips' }), righe = [];
      v.opzioni.forEach(function (o) {
        var cb = el('input', { type: 'checkbox' }), lab = el('label', null, [cb, el('span', { text: o.t })]);
        righe.push({ o: o, cb: cb, lab: lab }); chips.appendChild(lab);
      });
      foglio.appendChild(chips);
      return {
        nodo: d.nodo, foglio: foglio,
        leggi: function () {
          if (!c.abit.value.trim() && !c.area.value.trim() && !c.dA.value.trim()) { c.abit.focus(); return null; }
          return { abit: numero(c.abit.value), area: numero(c.area.value), dA: numero(c.dA.value), dB: numero(c.dB.value),
            distA: c.distA.valore(), distB: c.distB.valore(), meta: v.meta ? numero(c.meta.value) : null,
            scelte: righe.map(function (x) { return x.cb.checked; }) };
        },
        segna: function (val) {
          ['abit', 'area', 'dA', 'dB'].concat(v.meta ? ['meta'] : []).forEach(function (k) {
            c[k].disabled = true; c[k].classList.add(val.ok[k] ? 'ok' : 'ko');
            if (!val.ok[k]) c[k + 'X'].textContent = val.giusti[k];
          });
          c.distA.blocca(); c.distB.blocca();
          c.distA.classList.add(val.ok.dist ? 'ok' : 'ko'); c.distB.classList.add(val.ok.dist ? 'ok' : 'ko');
          if (!val.ok.dist) c.distX.textContent = 'A ' + (v.sparsaA ? 'sparsa' : 'accentrata') + ', B ' + (v.sparsaA ? 'accentrata' : 'sparsa');
          righe.forEach(function (x) { x.cb.disabled = true; if (x.o.g) x.lab.classList.add('giusta'); else if (x.cb.checked) x.lab.classList.add('sbagliata'); });
        },
        soluzione: function (anim) { d.api.soluzione(anim, Orologio()); }
      };
    },
    valuta: function (v, r) {
      var L = v.L, A2 = L * L, N = v.N, d = v.d, ok = {}, errori = [], giusti = {};
      function err(c, t) { errori.push({ c: c, t: t }); }
      function vicino(x, y) { return !isNaN(x) && x !== null && Math.abs(x - y) < 0.01; }
      ok.abit = r.abit === N; giusti.abit = String(N);
      if (!ok.abit) err('conta', 'Gli abitanti sono ' + N + '. Conta a gruppi, riga per riga.');
      ok.area = vicino(r.area, A2); giusti.area = A2 + ' km\u00b2';
      if (!ok.area) {
        if (vicino(r.area, 4 * L)) err('perimetro', 'Hai calcolato il perimetro (' + L + ' + ' + L + ' + ' + L + ' + ' + L + '). L\u2019area \u00e8 lato \u00d7 lato: ' + L + ' \u00d7 ' + L + ' = ' + A2 + ' km\u00b2.');
        else if (vicino(r.area, 2 * L)) err('lati', 'Hai sommato due lati. L\u2019area \u00e8 lato \u00d7 lato: ' + A2 + ' km\u00b2.');
        else if (vicino(r.area, L) && L > 1) err('lato', 'Questo \u00e8 il lato. L\u2019area \u00e8 lato \u00d7 lato: ' + A2 + ' km\u00b2.');
        else err('area', 'L\u2019area del quadrato \u00e8 lato \u00d7 lato: ' + L + ' \u00d7 ' + L + ' = ' + A2 + ' km\u00b2.');
      }
      function dens(k, lab) {
        var x = r[k];
        ok[k] = vicino(x, d); giusti[k] = d + ' ab/km\u00b2';
        if (ok[k]) return;
        if (vicino(x, A2 / N)) err('invertita', 'Densit\u00e0 di ' + lab + ': hai messo l\u2019area sopra. Il soggetto, gli abitanti, va al numeratore: ' + N + ' \u00f7 ' + A2 + ' = ' + d + '.');
        else if (vicino(x, N / (4 * L))) err('perPerimetro', 'Densit\u00e0 di ' + lab + ': hai diviso per il perimetro. Si divide per l\u2019area: ' + N + ' \u00f7 ' + A2 + ' = ' + d + '.');
        else if (vicino(x, N / L) && L > 1) err('perLato', 'Densit\u00e0 di ' + lab + ': hai diviso per il lato. Si divide per l\u2019area: ' + N + ' \u00f7 ' + A2 + ' = ' + d + '.');
        else if (vicino(x, N) && A2 > 1) err('nonDiviso', 'Densit\u00e0 di ' + lab + ': ' + N + ' sono gli abitanti. Va diviso per l\u2019area: ' + N + ' \u00f7 ' + A2 + ' = ' + d + '.');
        else if (k === 'dB' && ok.dA) err('diverse', 'Densit\u00e0 di B: \u00e8 uguale ad A, ' + d + ' ab/km\u00b2. Stessi abitanti sulla stessa area: cambia solo come sono distribuiti.');
        else err('densita', 'Densit\u00e0 di ' + lab + ' = abitanti \u00f7 area = ' + N + ' \u00f7 ' + A2 + ' = ' + d + ' ab/km\u00b2.');
      }
      dens('dA', 'A'); dens('dB', 'B');
      ok.dist = r.distA === (v.sparsaA ? 'sparsa' : 'accentrata') && r.distB === (v.sparsaA ? 'accentrata' : 'sparsa');
      if (!ok.dist) err('distr', 'Distribuzione: ' + nomi(v).sparsa + ' \u00e8 sparsa (case su tutto il territorio), ' + nomi(v).accentrata + ' \u00e8 accentrata (tutti raccolti in una parte).');
      if (v.meta) {
        ok.meta = vicino(r.meta, 2 * d); giusti.meta = 2 * d + ' ab/km\u00b2';
        if (!ok.meta) err('meta', 'Parte abitata: ' + N + ' abitanti su met\u00e0 quadrato, ' + fmt(A2 / 2) + ' km\u00b2. ' + N + ' \u00f7 ' + fmt(A2 / 2) + ' = ' + 2 * d + ' ab/km\u00b2.');
      }
      var casuale = false, perche = true;
      v.opzioni.forEach(function (o, i) { if (!!r.scelte[i] !== o.g) perche = false; if (!o.g && r.scelte[i] && /casuale/.test(o.t)) casuale = true; });
      if (casuale) err('casuale', 'Il perch\u00e9: \u00abin geografia non c\u2019\u00e8 niente di casuale\u00bb, la distribuzione ha sempre delle ragioni.');
      else if (!perche) err('perche', 'Il perch\u00e9: le ipotesi giuste sono quelle segnate in blu. Densit\u00e0, abitanti e grandezza qui sono uguali, quindi non spiegano la differenza.');
      return { preso: ok.area && ok.dA && ok.dB && ok.dist, errori: errori, ok: ok, giusti: giusti,
        nota: 'Per il punto contano area, densit\u00e0 e distribuzione. ' + (v.meta ? 'La parte abitata e il perch\u00e9 servono' : 'Il perch\u00e9 serve') + ' a capire, come in aula.' };
    },
    procedimento: function (v) {
      var nm = nomi(v), A2 = v.L * v.L;
      function scena() { return disegnaDensita(v, {}); }
      var passi = [
        { scena: 's', titolo: 'Conta gli abitanti', testo: 'Ogni pallino \u00e8 un abitante: in A ce ne sono ' + v.N + ', e altrettanti in B.', fai: function (a, an, t) { a.conta('A', an, t); a.conta('B', false, t); } },
        { scena: 's', titolo: 'L\u2019area', testo: 'Area del quadrato = lato \u00d7 lato = ' + v.L + ' \u00d7 ' + v.L + ' = ' + A2 + ' km\u00b2' +
          (v.L > 1 ? ': sono ' + A2 + ' quadratini da 1 km\u00b2. Non ' + v.L + ' + ' + v.L + ' + ' + v.L + ' + ' + v.L + ', che \u00e8 il perimetro.' : '.'),
          regola: 'Area = lato \u00d7 lato.', fai: function (a, an, t) { a.celle('A', an, t); } },
        { scena: 's', titolo: 'La densit\u00e0', testo: 'Densit\u00e0 = abitanti \u00f7 area. Gli abitanti, il soggetto, vanno sopra: ' + v.N + ' \u00f7 ' + A2 + ' = ' + v.d + ' ab/km\u00b2. Uguale in A e in B.',
          regola: 'Il soggetto va al numeratore.', extra: function () { return formula(String(v.N), String(A2), v.d + ' ab/km\u00b2'); },
          fai: function (a, an, t) { a.densita('A', an, t); a.densita('B', an, t); } },
        { scena: 's', titolo: 'La distribuzione', testo: 'Stessa densit\u00e0, ma in ' + nm.sparsa + ' le case sono su tutto il territorio: \u00e8 sparsa. In ' + nm.accentrata + ' sono raccolte in una parte: \u00e8 accentrata.',
          fai: function (a, an, t) { a.distribuzione(an, t); } }
      ];
      if (v.meta) passi.push({ scena: 's', titolo: 'La parte abitata', testo: 'Oltre la diagonale di ' + nm.accentrata + ' non abita nessuno. I ' + v.N + ' abitanti stanno su met\u00e0 quadrato, ' + fmt(A2 / 2) + ' km\u00b2: ' + v.N + ' \u00f7 ' + fmt(A2 / 2) + ' = ' + 2 * v.d + ' ab/km\u00b2.',
        extra: function () { return formula(String(v.N), fmt(A2 / 2), 2 * v.d + ' ab/km\u00b2'); }, fai: function (a, an, t) { a.meta(an, t); } });
      passi.push({ scena: 's', titolo: 'Il perch\u00e9', testo: v.focus === 'accentrata' ? 'Ci si raccoglie quando l\u2019acqua c\u2019\u00e8 solo in un punto, quando serve difendersi dentro le mura, quando terra fertile e strade stanno solo in una parte.'
        : 'Si vive sparsi quando acqua, terra fertile e strade ci sono ovunque e il territorio \u00e8 sicuro.', regola: 'In geografia niente \u00e8 casuale.' });
      return { scena: scena, passi: passi };
    },
    // Il tutorial: l'esempio di aula, lato 1 km e 9 abitanti in entrambi i quadrati.
    tutorial: function (e) {
      var r = rngDa(20260929);
      var aula = { L: 1, d: 9, N: 9, meta: false, pozzo: true, sparsaA: true, centro: [0.62, 0.42],
        pSparsa: [[.17, .18], [.5, .14], [.83, .2], [.2, .52], [.52, .48], [.8, .55], [.15, .84], [.47, .8], [.85, .83]],
        pAccentrata: [[.55, .32], [.66, .3], [.6, .44], [.72, .42], [.52, .46], [.64, .54], [.76, .33], [.56, .58], [.7, .56]] };
      var due = { L: 2, d: 3, N: 12, meta: false, pozzo: false, sparsaA: true, centro: [.4, .4] };
      due.pSparsa = puntiSparsi(r, 12); due.pAccentrata = puntiAccentrati(r, 12, [.4, .4], false);
      var meta = JSON.parse(JSON.stringify(aula)); meta.meta = true; meta.pozzo = false; meta.centro = [.3, .3];
      meta.pAccentrata = [[.2, .2], [.32, .15], [.14, .34], [.28, .3], [.44, .24], [.2, .47], [.36, .42], [.52, .14], [.12, .62]];
      var scene = { aula: aula, due: due, meta: meta };
      function scena(nome, opz) { return disegnaDensita(scene[nome], opz || {}); }
      var passi = [
        { scena: 'aula', stampa: 'testo', momentaneo: true, titolo: 'Il secondo esercizio della prova', testo: ['Due quadrati. Ogni pallino \u00e8 un abitante. Sotto c\u2019\u00e8 il lato: qui 1 km, come in aula.', 'Si calcolano area e densit\u00e0, poi si guarda come sono distribuiti gli abitanti, e perch\u00e9.'],
          fai: function (a, an, t) { a.lati(an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Conta gli abitanti', testo: 'In A ci sono 9 pallini: 9 abitanti.', fai: function (a, an, t) { a.conta('A', an, t); } },
        { scena: 'aula', stampa: true, titolo: 'E in B?', testo: 'Anche in B: 9 abitanti.', fai: function (a, an, t) { a.conta('B', an, t); } },
        { scena: 'due', stampa: 'testo', titolo: 'L\u2019area: lato \u00d7 lato', testo: ['Con il lato di 1 km l\u2019area \u00e8 1 \u00d7 1 = 1 km\u00b2. Se il lato \u00e8 2 km, l\u2019area \u00e8 2 \u00d7 2 = 4 km\u00b2: quattro quadratini da 1 km\u00b2.', 'Guarda: si contano proprio i quadratini.'],
          regola: 'Area del quadrato = lato \u00d7 lato.', fai: function (a, an, t) { a.celle('A', an, t); } },
        { scena: 'due', stampa: true, titolo: 'L\u2019errore di ogni anno', testo: ['2 + 2 + 2 + 2 = 8 non \u00e8 l\u2019area: \u00e8 il perimetro, la lunghezza del bordo.', 'Il docente lo vede tutti gli anni. L\u2019area del quadrato di lato 2 \u00e8 4 km\u00b2.'],
          fai: function (a, an, t) { a.perimetro('A', an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'La densit\u00e0', testo: ['Densit\u00e0 = abitanti \u00f7 area. Gli abitanti sono il soggetto e vanno sopra, al numeratore: vale per tutti i tassi e gli indici.', 'In A: 9 \u00f7 1 = 9 abitanti per km\u00b2.'],
          regola: 'Il soggetto va al numeratore.', extra: function () { return formula('9', '1', '9 ab/km\u00b2'); }, fai: function (a, an, t) { a.conta('A', false, t); a.conta('B', false, t); a.densita('A', an, t); } },
        { scena: 'aula', stampa: true, titolo: '\u00abCome uguale?\u00bb', testo: ['In B: 9 \u00f7 1 = 9 ab/km\u00b2. La stessa densit\u00e0.', 'Eppure i due quadrati sono diversissimi: la densit\u00e0 media, da sola, non dice come vive la gente.'],
          fai: function (a, an, t) { a.densita('B', an, t); } },
        { scena: 'aula', stampa: true, titolo: 'Sparsa e accentrata', testo: ['In A le case sono su tutto il territorio: distribuzione sparsa, come le case sparse della campagna marchigiana.', 'In B sono raccolte in una parte: distribuzione accentrata.'],
          fai: function (a, an, t) { a.distribuzione(an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Il perch\u00e9', testo: ['\u00abNon mi dite casuale\u00bb: in geografia niente lo \u00e8.', 'Si vive sparsi se acqua, terra fertile e strade ci sono ovunque e se ci si sente sicuri. Ci si raccoglie se l\u2019acqua c\u2019\u00e8 solo nel pozzo (il cerchio blu) o se serve difendersi dentro le mura.'],
          regola: 'Acqua, terra, strade, sicurezza.' },
        { scena: 'meta', stampa: true, titolo: 'La parte abitata', testo: ['Qui oltre la diagonale di B non abita nessuno. I 9 abitanti vivono su mezzo km\u00b2.', '9 \u00f7 0,5 = 18 abitanti per km\u00b2: dove la gente vive davvero, vive pi\u00f9 fitta della media.'],
          extra: function () { return formula('9', '0,5', '18 ab/km\u00b2'); }, fai: function (a, an, t) { a.meta(an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Conta gli abitanti. 2. Area = lato \u00d7 lato. 3. Densit\u00e0 = abitanti \u00f7 area. 4. Stessa densit\u00e0? Guarda la distribuzione: sparsa o accentrata. 5. Spiega il perch\u00e9.', 'Ora prova tu: 15 coppie di quadrati sempre diverse.'],
          dopo: function () { return docente(e); }, fai: function (a, an, t) { a.soluzione(false, t); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Ogni pallino \u00e8 un abitante. Per ogni coppia di quadrati calcola area e densit\u00e0, indica la distribuzione (sparsa o accentrata) e spiega il perch\u00e9.</p>',
    stampa: function (v, n) {
      var d = disegnaDensita(v, { stampa: true, fs: 16, larghezza: '108mm' }), nm = nomi(v);
      return '<h3>' + n + '.</h3><div class="riga">' + d.nodo.outerHTML + '<div class="risp">Abitanti in A: ______<br>Area di un quadrato: ______ km\u00b2<br>Densit\u00e0 di A: ______ ab/km\u00b2<br>Densit\u00e0 di B: ______ ab/km\u00b2<br>' +
        'A: sparsa / accentrata &nbsp; B: sparsa / accentrata<br>' + (v.meta ? 'Densit\u00e0 della parte abitata di ' + nm.accentrata + ': ______ ab/km\u00b2<br>' : '') + 'Perch\u00e9? ___________________________</div></div>';
    },
    soluzioni: function (vs) {
      return '<table><tr><th>N.</th><th>Abitanti</th><th>Area</th><th>Densit\u00e0 (A e B)</th><th>Distribuzione</th><th>Parte abitata</th></tr>' + vs.map(function (v, i) {
        var nm = nomi(v), A2 = v.L * v.L;
        return '<tr><td>' + (i + 1) + '</td><td>' + v.N + '</td><td>' + v.L + ' \u00d7 ' + v.L + ' = ' + A2 + ' km\u00b2</td><td>' + v.N + ' \u00f7 ' + A2 + ' = ' + v.d + ' ab/km\u00b2</td><td>' +
          nm.sparsa + ' sparsa, ' + nm.accentrata + ' accentrata</td><td>' + (v.meta ? v.N + ' \u00f7 ' + fmt(A2 / 2) + ' = ' + 2 * v.d + ' ab/km\u00b2' : '') + '</td></tr>';
      }).join('') + '</table><p style="font-size:9.5pt">Perch\u00e9: sparsa se acqua, terra fertile e strade sono ovunque e il territorio \u00e8 sicuro; accentrata se l\u2019acqua \u00e8 in un solo punto, se serve difendersi, se le risorse stanno in una parte. Mai \u00abcasuale\u00bb.</p>';
    }
  };

  /* =================================================================
     3. TIPI NUOVI SENZA DISEGNO: varianti preparate dal server
     ================================================================= */
  var BANCA = {
    senzaTavola: true,
    nomiErrori: { risposta: 'Risposta sbagliata' },
    serie: function (seme, n, _o, e) {
      var r = rngDa(seme), idx = rmescola(r, e.banca.map(function (_x, i) { return i; })), out = [];
      for (var i = 0; i < Math.min(n, idx.length); i++) {
        var q = e.banca[idx[i]];
        out.push({ q: q, ordine: rmescola(r, q.opzioni.map(function (_t, k) { return k; })) });
      }
      return out;
    },
    domanda: function (v) {
      var foglio = el('div'), nome = 'esx-b-' + Math.random().toString(36).slice(2), righe = [];
      foglio.appendChild(el('h4', { text: v.q.domanda }));
      var cont = el('div', { class: 'esx-chips' });
      v.ordine.forEach(function (k) {
        var r = el('input', { type: 'radio', name: nome }), lab = el('label', null, [r, el('span', { text: v.q.opzioni[k] })]);
        righe.push({ k: k, r: r, lab: lab }); cont.appendChild(lab);
      });
      foglio.appendChild(cont);
      return {
        nodo: null, foglio: foglio,
        leggi: function () { var s = righe.filter(function (x) { return x.r.checked; })[0]; return s ? s.k : null; },
        segna: function () { righe.forEach(function (x) { x.r.disabled = true; if (x.k === v.q.corretta) x.lab.classList.add('giusta'); else if (x.r.checked) x.lab.classList.add('sbagliata'); }); },
        soluzione: function () {}
      };
    },
    valuta: function (v, k) {
      var ok = k === v.q.corretta;
      return { preso: ok, errori: ok ? [] : [{ c: 'risposta', t: 'La risposta giusta \u00e8: ' + v.q.opzioni[v.q.corretta] + '.' }], nota: v.q.spiegazione || '' };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Scegli la risposta giusta.</p>',
    stampa: function (v, n) {
      return '<h3>' + n + '. ' + esc(v.q.domanda) + '</h3><div class="risp">' + v.ordine.map(function (k, i) { return String.fromCharCode(97 + i) + ') ' + esc(v.q.opzioni[k]); }).join('<br>') + '</div>';
    },
    soluzioni: function (vs) {
      return '<table><tr><th>N.</th><th>Risposta</th></tr>' + vs.map(function (v, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + String.fromCharCode(97 + v.ordine.indexOf(v.q.corretta)) + ') ' + esc(v.q.opzioni[v.q.corretta]) +
          (v.q.spiegazione ? '<br><small>' + esc(v.q.spiegazione) + '</small>' : '') + '</td></tr>';
      }).join('') + '</table>';
    }
  };

  // per i collaudi automatici
  try { window.UMS_ESERCIZI = { RETICOLO: RETICOLO, DENSITA: DENSITA, BANCA: BANCA, geometria: geometria, CITTA: CITTA, htmlScheda: htmlScheda, absLat: absLat, absLon: absLon }; } catch (e) {}
})();
