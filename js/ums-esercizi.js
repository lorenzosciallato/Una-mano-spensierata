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

   Tipi: reticolo_coordinate, densita_popolamento, tassi_demografici,
   grafico_dati, altro (scorta di
   varianti preparata dal server, oppure "da costruire").
============================================================ */
(function () {
  'use strict';

  var file = null;
  try { file = new URLSearchParams(location.search).get('file'); } catch (e) {}
  if (!file) return;

  var RIDUCI = false;
  try { RIDUCI = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var COPIONI = null;
  // i copioni dei video tutorial (voce e sottotitoli): se mancano, resta "Impara il metodo"
  var copioniPronti = fetch('esercizi-video/copioni.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  Promise.all([fetch(file).then(function (r) { return r.json(); }), copioniPronti]).then(function (ris) {
    var d = ris[0]; COPIONI = ris[1];
    var b = d && d.esercizi;
    var lista = (b && Array.isArray(b.trovati) ? b.trovati : []).filter(function (e) {
      if (!e || !e.tipo) return false;
      // Le lezioni nuove arrivano dal server come "altro": si riconoscono dal titolo e vanno al loro motore.
      if (e.tipo === 'altro') {
        var tt = String(e.titolo || '') + ' ' + String(e.consegna || '');
        if (/tass[oi]|natalit|mortalit|incremento naturale/i.test(tt)) e.tipo = 'tassi_demografici';
        else if (/\bgrafic[oi]\b|istogramm/i.test(tt)) e.tipo = 'grafico_dati';
      }
      if (e.tipo === 'altro') return e.da_costruire || (Array.isArray(e.banca) && e.banca.length > 0);
      return ['reticolo_coordinate', 'densita_popolamento', 'tassi_demografici', 'grafico_dati',
        'reticolo_posiziona', 'indici_demografici', 'densita_simboli', 'grafico_combinato'].indexOf(e.tipo) >= 0;
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
    // ?es=es3: si arriva da "Esercizi per l'esame" dell'indice, con l'esercizio già scelto
    var vuole = null, iniziale = 0;
    try { vuole = new URLSearchParams(location.search).get('es'); } catch (e0) {}
    lista.forEach(function (e, i) { if (vuole && e.id === vuole) iniziale = i; });
    if (lista.length > 1) {
      var scelta = el('div', { class: 'esx-scelta', role: 'group', 'aria-label': 'Scegli l\u2019esercizio' });
      lista.forEach(function (e, i) {
        var b = el('button', { type: 'button', 'aria-pressed': i === iniziale ? 'true' : 'false' },
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
    apri(lista[iniziale]);
    if (vuole) setTimeout(function () { apriDaFuori(acc); }, 500);
  }
  // apre la lezione e la sezione 09, poi ci scorre sopra
  function apriDaFuori(acc) {
    var master = document.getElementById('master-toggle-btn'), cont = document.getElementById('master-content');
    if (!master) return;   // pagina "Esercizi per l'esame": non c'è una lezione da aprire
    if (cont && !cont.classList.contains('open')) master.click();
    setTimeout(function () {
      var h = acc.querySelector('.accordion-header');
      var pan = h && (h.closest('.ums-acc-h') || h).nextElementSibling;
      if (h && pan && !pan.classList.contains('active')) h.click();
      acc.style.scrollMarginTop = '84px';
      setTimeout(function () { acc.scrollIntoView({ behavior: RIDUCI ? 'auto' : 'smooth', block: 'start' }); }, 450);
    }, 300);
  }

  function motoreDi(e) {
    return e.tipo === 'reticolo_coordinate' ? RETICOLO : e.tipo === 'densita_popolamento' ? DENSITA
         : e.tipo === 'tassi_demografici' ? TASSI : e.tipo === 'grafico_dati' ? GRAFICO
         : e.tipo === 'reticolo_posiziona' ? POSIZIONA : e.tipo === 'indici_demografici' ? INDICI
         : e.tipo === 'densita_simboli' ? DENSITA_S : e.tipo === 'grafico_combinato' ? COMBINATO
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
    var conVideo = conTutorial && !!(COPIONI && COPIONI.video && COPIONI.video[e.tipo]);
    var modi = [
      { k: 'impara', n: '1', t: conVideo ? 'Guarda il video' : 'Impara il metodo', s: conVideo ? 'Si ferma sugli esempi e ti fa rispondere' : 'Animazione passo passo', ok: conTutorial },
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
      if (k === 'impara') ferma = conVideo ? Video(contenuto, T, e, function () { vai('allena'); }) : Tutorial(contenuto, T, e, function () { vai('allena'); });
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
    box.imposta = function (v) {
      if (box.bloccato) return;
      opzioni.forEach(function (o, i) { if (o.v === v) { valore = v; Array.prototype.forEach.call(box.children, function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); } });
    };
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
    salva();
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
    box.appendChild(el('p', { text: (document.getElementById('master-toggle-btn') ? 'Tutti gli esercizi d\u2019esame di questa lezione (' : 'Tutti gli esercizi per l\u2019esame (') + elencoE(voci.map(function (x) { return x.e.titolo; })) + '). ' +
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
      '<header><h1>Esercizi d\u2019esame</h1><p>' + voci.map(function (x) { return esc(x.e.titolo); }).join(' \u2014 ') +
      '<br><b>Soluzioni in fondo al documento, ' + (voci.length > 2 ? 'per tutti gli esercizi' : voci.length > 1 ? 'sia per ' + voci.map(function (x) { return esc(minuscola(x.e.titolo)); }).join(' sia per ') : 'per ' + esc(minuscola(voci[0].e.titolo))) + '.</b></p></header>' + corpo + sol +
      '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>';
  }
  function elencoE(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]; }
  function minuscola(t) { t = String(t || ''); return t.charAt(0).toLowerCase() + t.slice(1); }
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
    ['Hong Kong', 22, 15, 'N', 114, 10, 'E'],
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
    // L'etichetta sbagliata (in aula: 150° al posto di 105°): il docente all'esame la mette apposta.
    // Compare in 6 esercizi su 15, mai nei primi tre, così prima si impara a leggere il reticolo.
    var trappola = !!CON_TRAPPOLA[i % N_PIANO];
    var conCitta = (i % 3) !== 1 && !zero;
    // Emisferi fissati per ogni serie da 15: 5 nord-est (per impratichirsi), poi 3 sud-est,
    // 3 nord-ovest e 4 sud-ovest. Così 7 esercizi hanno la latitudine sud, 7 la longitudine
    // ovest, e 4 hanno entrambe (i numeri crescono verso il basso E verso sinistra).
    var PIANO = ['NE', 'NE', 'NE', 'NE', 'NE', 'SE', 'NO', 'SE', 'NO', 'SO', 'SE', 'SO', 'NO', 'SO', 'SO'];
    var em = (PIANO[i % PIANO.length]).split('');
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
    if (trappola) v.trappola = creaTrappola(r, v, lineeLat, lineeLon);
    return v;
  }
  var N_PIANO = 15;
  var CON_TRAPPOLA = { 3: 1, 5: 1, 8: 1, 10: 1, 12: 1, 14: 1 };

  // Sull'asse della trappola servono due etichette giuste: solo così si capisce quale delle tre è sbagliata.
  function creaTrappola(r, v, lineeLat, lineeLon) {
    var asse = r() < 0.5 ? 'lon' : 'lat';
    var tutte = asse === 'lat' ? lineeLat : lineeLon, date = asse === 'lat' ? v.labLat : v.labLon;
    if (date.length < 2) {
      var altre = tutte.filter(function (x) { return date.every(function (d) { return Math.abs(d - x) >= 2; }); });
      if (!altre.length) return null;
      date.push(rpick(r, altre)); date.sort(function (x, y) { return x - y; });
    }
    var libere = tutte.filter(function (x) { return date.every(function (d) { return Math.abs(d - x) >= 2; }); });
    if (!libere.length) libere = tutte.filter(function (x) { return date.indexOf(x) < 0; });
    if (!libere.length) return null;
    var vera = rpick(r, libere), max = asse === 'lat' ? 89 : 180;
    var falsa = falsoCredibile(r, vera, max, tutte);
    if (falsa === null) return null;
    return { asse: asse, vera: vera, falsa: falsa, trovata: false };
  }
  // Errori di stampa verosimili: cifre scambiate (105 → 150), una cifra sbagliata, dieci gradi in più o in meno.
  function falsoCredibile(r, vera, max, tutte) {
    var s = String(vera), cand = [];
    if (s.length >= 2) {
      if (s[s.length - 1] !== '0') cand.push(Number(s.split('').reverse().join('')));
      cand.push(Number(s.slice(0, -2) + s.slice(-1) + s.slice(-2, -1)));
    }
    if (s.length === 3) cand.push(Number(s[0] + s[2] + s[1]));
    [10, -10, 20, -20, 30, -30].forEach(function (d) { cand.push(vera + d); });
    var buone = cand.filter(function (x, i) {
      return cand.indexOf(x) === i && x !== vera && x >= 1 && x <= max && Math.abs(x - vera) >= 3 && tutte.indexOf(x) < 0;
    });
    if (!buone.length) return null;
    var scambi = buone.filter(function (x) { return Math.abs(x - vera) % 10 !== 0; });
    return scambi.length && r() < 0.6 ? rpick(r, scambi) : rpick(r, buone);
  }

  function geometria(v, opz) {
    opz = opz || {};
    var CELL = opz.cella || (v.cols > 8 ? 52 : 64);
    var FS = opz.fs || (stretto() ? (v.cols > 8 ? 24 : 19) : 15);
    var SX = FS * 5.4, SY = 42;
    // se le etichette dei meridiani non stanno in una cella, si alternano su due righe
    var sfalsa = FS * 4.4 > CELL;
    var W = SX + v.cols * CELL + FS * 2.8, H = SY + v.rows * CELL + 22 + FS * 2 + 14 + (sfalsa ? FS + 4 : 0);
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
    // "Metti il punto" (lezione 15): i luoghi restano nascosti finché non si mostra la soluzione
    if (opz.senzaLuoghi) luoghi.setAttribute('visibility', 'hidden');
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
    var etic = { lat: {}, lon: {} }, tocchi = [];
    // In allenamento ogni etichetta si può toccare per dire «questa è sbagliata»: tutte, così toccarle non svela niente.
    function etichettaTesto(asse, valVero, scritto) {
      var p = asse === 'lat' ? posLat(valVero) : posLon(valVero), lw = FS * 5.4;
      var t0 = sv('text', { x: p.x, y: p.y, 'text-anchor': asse === 'lat' ? 'end' : 'middle', 'font-size': FS, 'font-style': 'italic' }, scritto + '\u00b000\u2032 ' + (asse === 'lat' ? v.ns : v.eo));
      if (!opz.interattivo) { base.appendChild(t0); return t0; }
      var g = sv('g', { class: 'esx-etic-trappola', tabindex: '0', role: 'button', 'aria-label': 'Etichetta ' + scritto + ' gradi: toccala se \u00e8 sbagliata' });
      g.appendChild(sv('rect', { x: asse === 'lon' ? p.x - lw / 2 : p.x - lw, y: p.y - FS, width: lw, height: FS + 8, rx: 5, fill: 'transparent', stroke: 'transparent' }));
      g.appendChild(t0);
      var tocca = function () { if (bloccate) return; if (opz.suEtichetta) opz.suEtichetta({ asse: asse, scritto: scritto, nodo: g }); };
      g.addEventListener('click', tocca);
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tocca(); } });
      tocchi.push(g); base.appendChild(g);
      return t0;
    }
    var bloccate = false;
    v.labLat.forEach(function (val) { etic.lat[val] = etichettaTesto('lat', val, val); });
    v.labLon.forEach(function (val) { etic.lon[val] = etichettaTesto('lon', val, val); });
    if (G.sfalsa) for (var jj = 0; jj <= v.cols; jj++) if (jj % 2) {
      var xv = G.gx0 + jj * G.CELL;
      base.appendChild(sv('line', { x1: xv, y1: G.gy1 + 6, x2: xv, y2: G.gy1 + 10 + FS, stroke: stampa ? '#999' : SEPPIA, 'stroke-width': .8, opacity: .6 }));
    }
    if (v.trappola) etichettaTesto(v.trappola.asse, v.trappola.vera, v.trappola.falsa);
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
      mostraLuoghi: function (anim, t) { luoghi.removeAttribute('visibility'); appariDopo(luoghi, anim, t, 100); },
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
          var cer = sv('ellipse', { cx: asse === 'lat' ? p.x - FS * 2 : p.x, cy: p.y - FS * 0.35, rx: asse === 'lat' ? FS * 2.5 : FS * 2.9, ry: FS * 0.95, fill: 'none', stroke: ORO, 'stroke-width': 2.6 });
          sopra.appendChild(cer); appariDopo(cer, anim, t, 50);
          var riga = (asse === 'lat' ? lineeH[val] : lineeV[val]).cloneNode();
          riga.setAttribute('stroke', ORO); riga.setAttribute('stroke-width', 3.4);
          sotto.appendChild(riga); traccia(riga, anim, t, 350, 800);
        });
      },
      sospetto: function (anim, t) {
        if (!v.trappola) return;
        var tr = v.trappola, p = tr.asse === 'lon' ? posLon(tr.vera) : posLat(tr.vera);
        var e1 = sv('ellipse', { cx: tr.asse === 'lat' ? p.x - FS * 2 : p.x, cy: p.y - FS * 0.35, rx: tr.asse === 'lat' ? FS * 2.5 : FS * 2.9, ry: FS * 0.95, fill: 'none', stroke: ROSSO, 'stroke-width': 2.6 });
        sopra.appendChild(e1); appariDopo(e1, anim, t, 80);
      },
      trappola: function (anim, t) {
        if (!v.trappola) return;
        var tr = v.trappola, p = tr.asse === 'lon' ? posLon(tr.vera) : posLat(tr.vera), w2 = FS * 4.6;
        var x1 = tr.asse === 'lon' ? p.x - w2 / 2 : p.x - w2, x2 = tr.asse === 'lon' ? p.x + w2 / 2 : p.x;
        var barra = sv('line', { x1: x1, y1: p.y - FS * 0.35, x2: x2, y2: p.y - FS * 0.35, stroke: ROSSO, 'stroke-width': 2.6 });
        sopra.appendChild(barra); traccia(barra, anim, t, 100, 400);
        var giusto = tr.asse === 'lon'
          ? sv('text', { x: p.x, y: p.y + FS + 4, 'text-anchor': 'middle', 'font-size': FS, fill: BLU, 'font-style': 'italic', 'font-weight': 700 }, tr.vera + '\u00b000\u2032')
          : sv('text', { x: p.x, y: p.y - FS - 2, 'text-anchor': 'end', 'font-size': FS, fill: BLU, 'font-style': 'italic', 'font-weight': 700 }, tr.vera + '\u00b000\u2032');
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
          var n = sv('text', { x: p.x, y: p.y, 'text-anchor': asse === 'lat' ? 'end' : 'middle', 'font-size': FS - 1, fill: BLU, 'font-style': 'italic' }, val + '\u00b000\u2032 ' + (asse === 'lat' ? v.ns : v.eo));
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
    api.bloccaTrappola = function () { bloccate = true; tocchi.forEach(function (g) { g.removeAttribute('tabindex'); g.style.cursor = 'default'; }); };
    api.segnaTocco = function (nodo) {
      tocchi.forEach(function (g) { var rr = g.firstChild; rr.setAttribute('stroke', g === nodo ? ROSSO : 'transparent'); rr.setAttribute('stroke-width', g === nodo ? 2 : 0); });
    };
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
      stima: 'Stimare male la frazione del riquadro',
      trappola: 'Non accorgersi dell\u2019etichetta sbagliata',
      trappolaValore: 'Correggere l\u2019etichetta sbagliata con il valore sbagliato',
      trappolaInventata: 'Vedere un errore dove non c\u2019\u00e8'
    },
    // "v" cambia quando cambia il modo di generare la serie: le serie salvate prima ripartono da capo.
    opzioni: function () { return stretto() ? { cols: 6, rows: 5, v: 2 } : { cols: 8, rows: 6, v: 2 }; },
    opzioniStampa: function () { return { cols: 8, rows: 6 }; },
    serie: function (seme, n, opz) {
      var r = rngDa(seme), usate = {}, out = [];
      for (var i = 0; i < n; i++) out.push(varianteReticolo(r, i, opz.cols || 8, opz.rows || 6, usate));
      return out;
    },
    domanda: function (v0) {
      var v = JSON.parse(JSON.stringify(v0));
      var foglio = el('div'), campi = [], et = {};
      var d = disegnaReticolo(v, { interattivo: true, suEtichetta: function (x) {
        et.scelta.imposta('si'); et.scritto.value = x.scritto; d.api.segnaTocco(x.nodo); et.giusto.focus();
      } });
      // Prima domanda: le etichette. Il docente ne mette una sbagliata, come il 150° al posto di 105° visto in aula.
      var blocco0 = el('div', { class: 'esx-luogo esx-etic' });
      blocco0.appendChild(el('h5', { text: 'Le etichette dei gradi sono tutte giuste?' }));
      blocco0.appendChild(el('p', { class: 'esx-nota', style: 'margin:-4px 0 10px', text: 'Se una \u00e8 sbagliata, scrivi che cosa c\u2019\u00e8 scritto e che cosa doveva esserci.' }));
      et.scelta = segmentato([{ t: 'Tutte giuste', v: 'no' }, { t: 'Una \u00e8 sbagliata', v: 'si' }], 'Le etichette dei gradi sono tutte giuste?');
      et.scritto = el('input', { class: 'esx-campo', inputmode: 'numeric', 'aria-label': 'Etichetta sbagliata: che cosa c\u2019\u00e8 scritto', autocomplete: 'off' });
      et.giusto = el('input', { class: 'esx-campo', inputmode: 'numeric', 'aria-label': 'Etichetta sbagliata: che cosa doveva esserci', autocomplete: 'off' });
      et.X = el('span', { class: 'esx-giusto' });
      [et.scritto, et.giusto].forEach(function (c) { c.addEventListener('input', function () { if (c.value.trim()) et.scelta.imposta('si'); }); });
      blocco0.appendChild(el('div', { class: 'esx-riga' }, [et.scelta]));
      blocco0.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'C\u2019\u00e8 scritto' }), et.scritto, el('span', { class: 'esx-unita', text: '\u00b0' })]));
      blocco0.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'Doveva esserci' }), et.giusto, el('span', { class: 'esx-unita', text: '\u00b0' }), et.X]));
      blocco0.appendChild(el('p', { class: 'esx-nota', style: 'margin:0 0 4px', text: 'Puoi anche toccare l\u2019etichetta sbagliata sul reticolo.' }));
      foglio.appendChild(blocco0);
      foglio.appendChild(el('h4', { style: 'margin-top:16px', text: 'Scrivi le coordinate dei due luoghi' }));
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
          return { et: { scelta: et.scelta.valore(), scritto: numero(et.scritto.value), giusto: numero(et.giusto.value) }, luoghi: campi.map(function (x) {
            return { latG: numero(x.c.latG.value), latM: x.c.latM.value.trim(), ns: x.c.latD.valore(),
              lonG: numero(x.c.lonG.value), lonM: x.c.lonM.value.trim(), eo: x.c.lonD.valore() };
          }) };
        },
        segna: function (val) {
          d.api.bloccaTrappola();
          et.scelta.blocca(); et.scelta.classList.add(val.etOk ? 'ok' : 'ko');
          [et.scritto, et.giusto].forEach(function (c) { c.disabled = true; if (v.trappola || c.value.trim()) c.classList.add(val.etOk ? 'ok' : 'ko'); });
          if (!val.etOk) et.X.textContent = v.trappola ? 'era ' + v.trappola.falsa + '\u00b0 \u2192 ' + v.trappola.vera + '\u00b0' : 'erano tutte giuste';
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
      var e0 = r.et || {}, etOk;
      if (v.trappola) {
        var tr = v.trappola;
        if (e0.scelta !== 'si') { etOk = false; err('trappola', 'C\u2019era un\u2019etichetta sbagliata: ' + tr.falsa + '\u00b0. Contando un grado per linea dalle altre etichette, l\u00ec doveva esserci ' + tr.vera + '\u00b0.'); }
        else if (e0.scritto !== tr.falsa) { etOk = false; err('trappolaValore', 'L\u2019etichetta sbagliata era ' + tr.falsa + '\u00b0, non ' + (isNaN(e0.scritto) ? 'quella che hai indicato' : e0.scritto + '\u00b0') + '. Le altre etichette sono coerenti tra loro: ' + tr.falsa + '\u00b0 no.'); }
        else if (e0.giusto !== tr.vera) { etOk = false; err('trappolaValore', 'Hai trovato l\u2019etichetta sbagliata (' + tr.falsa + '\u00b0), ma il valore giusto \u00e8 ' + tr.vera + '\u00b0: conta un grado per linea partendo dall\u2019etichetta pi\u00f9 vicina.'); }
        else etOk = true;
      } else {
        etOk = e0.scelta === 'no' || (e0.scelta == null && isNaN(e0.scritto));
        if (!etOk) err('trappolaInventata', 'Qui le etichette erano tutte giuste. Controlla sempre che tra una linea e l\u2019altra il valore cambi di un grado.');
      }
      if (!etOk) tuttoOk = false;
      return { preso: tuttoOk, errori: errori, campi: campi, etOk: etOk,
        nota: (v.citta ? 'Sono le coordinate reali dei due luoghi, arrotondate ai 5 primi. ' : 'Le citt\u00e0 sono immaginarie: conta solo leggere bene il reticolo. ') + 'La correzione accetta 5\u2032 in pi\u00f9 o in meno: \u00e8 una stima a occhio.' };
    },
    procedimento: function (v0) {
      var v = JSON.parse(JSON.stringify(v0));
      if (v.trappola) v.trappola.trovata = false;
      function scena() { var vv = JSON.parse(JSON.stringify(v)); return disegnaReticolo(vv, {}); }
      var passi = [];
      if (v.trappola) {
        var tr = v.trappola, dateT = tr.asse === 'lat' ? v.labLat : v.labLon;
        passi.push({ scena: 's', titolo: 'Prima di tutto: controlla le etichette', testo: 'Le etichette ' + dateT.map(function (x) { return x + '\u00b0'; }).join(' e ') + ' sono coerenti: tra una linea e l\u2019altra cambiano di un grado. ' + tr.falsa + '\u00b0 invece non torna con la sua posizione.',
          fai: function (a, an, t) { a.etichetta(tr.asse, an, t); a.sospetto(an, t); } });
        passi.push({ scena: 's', titolo: 'L\u2019etichetta sbagliata', testo: 'Contando un grado per linea dall\u2019etichetta pi\u00f9 vicina, l\u00ec doveva esserci ' + tr.vera + '\u00b0. Si barra ' + tr.falsa + '\u00b0 e si scrive il valore giusto: all\u2019esame va segnalato.',
          regola: 'C\u2019\u00e8 scritto ' + tr.falsa + '\u00b0, doveva esserci ' + tr.vera + '\u00b0.', fai: function (a, an, t) { a.trappola(an, t); } });
      }
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
      // L'errore visto in aula: sul libro, al posto di 105° E c'era scritto 150° E.
      var errore = { cols: 11, rows: 6, a0: 18, b0: 104, ns: 'N', eo: 'E', labLat: [20], labLon: [108, 112], citta: true,
        trappola: { asse: 'lon', vera: 105, falsa: 150, trovata: false },
        punti: [{ nome: 'Hanoi', latG: 21, latM: 0, lonG: 105, lonM: 50 }, { nome: 'Hong Kong', latG: 22, latM: 15, lonG: 114, lonM: 10 }] };
      var scene = { aula: aula, sud: sud, errore: errore };
      function scena(nome, opz) { return disegnaReticolo(JSON.parse(JSON.stringify(scene[nome])), opz || {}); }
      function ha(a) { return a.v.punti[0]; }
      function hk(a) { return a.v.punti[1]; }
      var passi = [
        { scena: 'aula', stampa: 'testo', momentaneo: true, titolo: 'L\u2019esercizio numero uno della prova', testo: ['All\u2019esame trovi un reticolo come questo: linee orizzontali e verticali, a un grado l\u2019una dall\u2019altra, e dei luoghi da localizzare. \u00c8 il reticolo visto in aula, con Hanoi e Hong Kong.', 'Cambieranno i numeri, non il metodo.'],
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
        { scena: 'errore', stampa: 'testo', momentaneo: true, titolo: 'Attenzione: un\u2019etichetta pu\u00f2 essere sbagliata', testo: ['All\u2019esame il docente pu\u00f2 stampare apposta un grado sbagliato. Va scovato e corretto, oltre a trovare le coordinate.', 'Guarda le etichette dei meridiani: 108\u00b0 E, 112\u00b0 E e 150\u00b0 E. Da 108 a 112 ci sono quattro spazi tra le linee, cio\u00e8 quattro gradi: tornano. E 150?'],
          fai: function (a, an, t) { a.etichetta('lon', an, t); } },
        { scena: 'errore', stampa: true, titolo: 'Conta le linee', testo: ['L\u2019etichetta 150\u00b0 E sta tre linee a sinistra di 108\u00b0 E: 108 \u2212 3 = 105. L\u00ec doveva esserci 105\u00b0 E.', '\u00c8 proprio l\u2019errore visto in aula: le cifre 0 e 5 scambiate. Si barra e si scrive accanto il valore giusto.'],
          regola: 'C\u2019\u00e8 scritto 150\u00b0, doveva esserci 105\u00b0: va segnalato nella risposta.',
          fai: function (a, an, t) { a.sospetto(an, t); a.trappola(an, t); } },
        { scena: 'errore', stampa: 'testo', titolo: 'Come si riconosce', testo: ['Le etichette giuste vanno d\u2019accordo tra loro: tra due linee vicine c\u2019\u00e8 sempre un grado. Quella sbagliata no.', 'Gli errori tipici: cifre scambiate (105 \u2192 150), una cifra cambiata, dieci gradi in pi\u00f9 o in meno. Poi si va avanti come sempre, usando solo le etichette giuste.'],
          regola: 'Prima di tutto controlla che le etichette siano coerenti.', fai: function (a, an, t) { a.valori('lon', an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Controlla le etichette: se una non torna, scrivi che cosa c\u2019\u00e8 scritto e che cosa doveva esserci. 2. Scrivi i valori di tutte le linee. 3. Per ogni luogo prendi la linea con il valore pi\u00f9 basso. 4. Stima i primi come sull\u2019orologio. 5. Scrivi gradi, primi e direzione: N o S, E o O.', 'Ora prova tu: 15 reticoli sempre diversi, e in alcuni c\u2019\u00e8 un\u2019etichetta sbagliata.'],
          dopo: function () { return docente(e); }, fai: function (a, an, t) { a.soluzione(false, t); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni reticolo scrivi latitudine e longitudine dei due luoghi in gradi e primi, con la direzione (N o S, E o O). Il nord \u00e8 in alto; tra una linea e l\u2019altra c\u2019\u00e8 un grado. <b>Attenzione: in alcuni reticoli un\u2019etichetta \u00e8 sbagliata.</b> Se la trovi, scrivi che cosa c\u2019\u00e8 scritto e che cosa doveva esserci.</p>',
    stampa: function (v, n) {
      var d = disegnaReticolo(v, { stampa: true, fs: 16, larghezza: '90mm' });
      var risp = ordinaLuoghi(v).map(function (p) {
        return '<div><b>' + esc(p.nome) + '</b><br>Lat. _____\u00b0 _____\u2032 ____<br>Long. _____\u00b0 _____\u2032 ____</div>';
      }).join('<div style="height:8px"></div>');
      var etq = '<div style="margin-top:8px"><b>Etichette</b><br>tutte giuste &#9744; &nbsp; una sbagliata &#9744;<br>c\u2019\u00e8 scritto ____\u00b0 doveva esserci ____\u00b0</div>';
      return '<h3>' + n + '.</h3><div class="riga">' + d.nodo.outerHTML + '<div class="risp">' + risp + etq + '</div></div>';
    },
    soluzioni: function (vs) {
      return '<table><tr><th>N.</th><th>Primo luogo</th><th>Secondo luogo</th><th>Etichette</th></tr>' + vs.map(function (v, i) {
        return '<tr><td>' + (i + 1) + '</td>' + ordinaLuoghi(v).map(function (p) {
          return '<td><b>' + esc(p.nome) + '</b>: ' + coord(p.latG, p.latM, v.ns) + ', ' + coord(p.lonG, p.lonM, v.eo) + '</td>';
        }).join('') + '<td>' + (v.trappola ? '<b>Etichetta sbagliata:</b> c\u2019\u00e8 scritto ' + v.trappola.falsa + '\u00b0, doveva esserci ' + v.trappola.vera + '\u00b0' : 'Etichette tutte giuste') + '</td></tr>';
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

  /* =================================================================
     4. TASSI DEMOGRAFICI E DATO SUPERFLUO
     Dalla lezione 5: un comune, i dati di 12 mesi, uno (o più) inutili.
     Tasso di natalità = nati ÷ popolazione × 1000 (‰), mortalità con i
     morti, incremento naturale = nati − morti, e il suo tasso = (nati −
     morti) ÷ popolazione × 1000. Il soggetto va sempre al numeratore.
     ================================================================= */
  function migliaia(x) {
    var neg = x < 0, s = String(Math.abs(Math.round(x)));
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + s;
  }
  function permille(x) { return fmt(Math.round(x * 10) / 10).replace('-', '−') + '‰'; }
  var DATI_T = {
    pop: { t: 'Abitanti al 1° gennaio', u: '' },
    nati: { t: 'Nati nei 12 mesi', u: '' },
    morti: { t: 'Morti nei 12 mesi', u: '' },
    imm: { t: 'Immigrati nei 12 mesi', u: '' },
    emi: { t: 'Emigrati nei 12 mesi', u: '' },
    sup: { t: 'Superficie del comune', u: ' km²' },
    fam: { t: 'Famiglie residenti', u: '' }
  };
  var CHIEDI_T = {
    nat: { t: 'il tasso di natalità', serve: ['nati', 'pop'], unita: '‰' },
    mor: { t: 'il tasso di mortalità', serve: ['morti', 'pop'], unita: '‰' },
    inc: { t: 'l’incremento (o decremento) naturale', serve: ['nati', 'morti'], unita: 'persone' },
    tinc: { t: 'il tasso di incremento (o decremento) naturale', serve: ['nati', 'morti', 'pop'], unita: '‰' }
  };
  var PIANO_T = ['nat', 'mor', 'nat', 'inc', 'mor', 'tinc', 'nat', 'inc', 'tinc', 'mor', 'inc', 'nat', 'tinc', 'mor', 'tinc'];
  var DECREMENTO_T = { 7: 1, 10: 1, 12: 1, 14: 1 };

  function varianteTassi(r, i, usate) {
    var chiede = PIANO_T[i % PIANO_T.length];
    var nomi = IMMAGINARIE.filter(function (x) { return !usate[x]; });
    var luogo = rpick(r, nomi.length ? nomi : IMMAGINARIE); usate[luogo] = true;
    var k = rint(r, 2, 25), pop = k * 10000;
    var tn = rint(r, 62, 118) / 10, tm;
    if (DECREMENTO_T[i]) tm = tn + rint(r, 8, 30) / 10;
    else tm = Math.max(5, tn - rint(r, 5, 30) / 10);
    tm = Math.round(tm * 10) / 10;
    var nati = Math.round(pop / 1000 * tn), morti = Math.round(pop / 1000 * tm);
    var v = { luogo: luogo, chiede: chiede, pop: pop, nati: nati, morti: morti };
    v.imm = Math.round(pop / 1000 * rint(r, 20, 140) / 10);
    v.emi = Math.round(pop / 1000 * rint(r, 20, 140) / 10);
    v.sup = rint(r, 18, 320);
    v.fam = Math.round(pop / (rint(r, 210, 270) / 100));
    // i dati in tabella: sempre popolazione, nati e morti, più uno o due inutili
    var extra = rmescola(r, ['imm', 'emi', 'sup', 'fam']).slice(0, r() < 0.5 ? 1 : 2);
    v.righe = rmescola(r, ['pop', 'nati', 'morti'].concat(extra));
    v.superflui = v.righe.filter(function (k2) { return CHIEDI_T[chiede].serve.indexOf(k2) < 0; });
    return v;
  }
  function rispostaTassi(v) {
    var n = v.nati, m = v.morti, p = v.pop;
    if (v.chiede === 'nat') return Math.round(n / p * 10000) / 10;
    if (v.chiede === 'mor') return Math.round(m / p * 10000) / 10;
    if (v.chiede === 'inc') return n - m;
    return Math.round((n - m) / p * 10000) / 10;
  }
  function testoTassi(v) {
    return 'Nel comune di ' + v.luogo + ' si raccolgono i dati di un anno (12 mesi). Calcola ' + CHIEDI_T[v.chiede].t + (v.chiede === 'inc' ? '' : ', espresso per mille') + ' e indica quali dati non servono.';
  }

  function disegnaTassi(v, opz) {
    opz = opz || {};
    var stampa = !!opz.stampa, FS = opz.fs || (stretto() ? 28 : 17), RIGA = FS * 2.3, W = 560;
    var H = 70 + v.righe.length * RIGA + 26;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', width: opz.larghezza || null,
      'aria-label': 'Scheda del comune di ' + v.luogo + ': ' + v.righe.map(function (k) { return DATI_T[k].t + ' ' + migliaia(v[k]) + DATI_T[k].u; }).join('; ') + '.' });
    var sotto = sv('g'), base = sv('g'), sopra = sv('g');
    svg.appendChild(sotto); svg.appendChild(base); svg.appendChild(sopra);
    var inch = stampa ? '#000' : INCH;
    base.appendChild(sv('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 10, fill: stampa ? '#fff' : 'rgba(255,255,255,.55)', stroke: stampa ? '#666' : SEPPIA, 'stroke-width': 1.4 }));
    base.appendChild(sv('text', { x: 28, y: 46, 'font-size': FS + 4, 'font-weight': 700 }, 'Comune di ' + v.luogo));
    base.appendChild(sv('text', { x: W - 28, y: 46, 'text-anchor': 'end', 'font-size': FS - 2, 'font-style': 'italic', fill: stampa ? '#444' : SEPPIA }, 'dati di 12 mesi'));
    var pos = {};
    v.righe.forEach(function (k, idx) {
      var y = 70 + idx * RIGA;
      pos[k] = y;
      base.appendChild(sv('line', { x1: 24, y1: y, x2: W - 24, y2: y, stroke: stampa ? '#bbb' : 'rgba(139,110,75,.45)', 'stroke-width': 1 }));
      base.appendChild(sv('text', { x: 28, y: y + RIGA * 0.66, 'font-size': FS, fill: inch }, DATI_T[k].t));
      base.appendChild(sv('text', { x: W - 28, y: y + RIGA * 0.66, 'text-anchor': 'end', 'font-size': FS + 1, 'font-weight': 700, fill: inch }, migliaia(v[k]) + DATI_T[k].u));
    });
    var api = {
      v: v,
      serve: function (anim, t) {
        CHIEDI_T[v.chiede].serve.forEach(function (k, i) {
          if (pos[k] == null) return;
          var rr = sv('rect', { x: 18, y: pos[k] + 3, width: W - 36, height: RIGA - 6, rx: 6, fill: 'rgba(200,169,110,.32)', stroke: ORO, 'stroke-width': 1.6 });
          sotto.appendChild(rr); appariDopo(rr, anim, t, 100 + i * 350);
        });
      },
      barra: function (anim, t) {
        v.superflui.forEach(function (k, i) {
          var y = pos[k] + RIGA * 0.5;
          var l = sv('line', { x1: 22, y1: y, x2: W - 22, y2: y, stroke: ROSSO, 'stroke-width': 3 });
          sopra.appendChild(l); traccia(l, anim, t, 100 + i * 400, 500);
        });
      },
      soluzione: function (anim, t) { api.serve(false, t); api.barra(false, t); }
    };
    return { nodo: svg, api: api };
  }

  // la frazione con il × 1000
  function formulaTasso(sopra, sotto, risultato, perMille) {
    var s = sv('svg', { viewBox: '0 0 340 110', role: 'img', style: 'max-width:330px', 'aria-label': sopra + ' diviso ' + sotto + (perMille ? ' per mille' : '') + ' uguale ' + risultato });
    var fsz = Math.max(18, 28 - Math.max(String(sopra).length, String(sotto).length) * 1.1);
    s.appendChild(sv('text', { x: 70, y: 40, 'text-anchor': 'middle', 'font-size': fsz, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, sopra));
    s.appendChild(sv('line', { x1: 10, y1: 52, x2: 130, y2: 52, stroke: INCH, 'stroke-width': 2.5 }));
    s.appendChild(sv('text', { x: 70, y: 86, 'text-anchor': 'middle', 'font-size': fsz, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, sotto));
    var x = 140;
    if (perMille) { s.appendChild(sv('text', { x: x, y: 62, 'font-size': 24, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, '× 1000')); x = 228; }
    s.appendChild(sv('text', { x: perMille ? x + 50 : 230, y: 62, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700, fill: BLU, 'font-family': 'Georgia,serif' }, '= ' + risultato));
    return s;
  }

  function passiCalcoloTassi(v) {
    var n = v.nati, m = v.morti, p = v.pop, ris = rispostaTassi(v), passi = [];
    var etich = { nat: 'natalità', mor: 'mortalità' };
    if (v.chiede === 'nat' || v.chiede === 'mor') {
      var sop = v.chiede === 'nat' ? n : m;
      passi.push({ titolo: 'Il calcolo', testo: 'Tasso di ' + etich[v.chiede] + ' = ' + (v.chiede === 'nat' ? 'nati' : 'morti') + ' ÷ popolazione × 1000 = ' + migliaia(sop) + ' ÷ ' + migliaia(p) + ' × 1000 = ' + permille(ris) + '.',
        regola: 'Il soggetto (' + (v.chiede === 'nat' ? 'i nati' : 'i morti') + ') va al numeratore.', extra: function () { return formulaTasso(migliaia(sop), migliaia(p), permille(ris), true); } });
    } else if (v.chiede === 'inc') {
      passi.push({ titolo: 'Il calcolo', testo: 'Incremento naturale = nati − morti = ' + migliaia(n) + ' − ' + migliaia(m) + ' = ' + (ris > 0 ? '+' : '') + migliaia(ris) + ' persone.',
        regola: ris >= 0 ? 'Nati più dei morti: è un incremento.' : 'Morti più dei nati: il risultato è negativo, è un decremento naturale.' });
    } else {
      passi.push({ titolo: 'Prima la differenza', testo: 'Nati − morti = ' + migliaia(n) + ' − ' + migliaia(m) + ' = ' + (n - m > 0 ? '+' : '') + migliaia(n - m) + ' persone. ' + (n - m >= 0 ? 'È un incremento.' : 'È un decremento.') });
      passi.push({ titolo: 'Poi si rapporta alla popolazione', testo: 'Il saldo da solo non basta: va messo in rapporto con gli abitanti. ' + migliaia(n - m) + ' ÷ ' + migliaia(p) + ' × 1000 = ' + permille(ris) + '.',
        regola: 'Il tasso è sempre un rapporto con la popolazione.', extra: function () { return formulaTasso(migliaia(n - m), migliaia(p), permille(ris), true); } });
    }
    return passi;
  }

  var TASSI = {
    nomiErrori: {
      superfluo: 'Non riconoscere il dato superfluo', scartato: 'Scartare un dato che serve',
      morti: 'Usare i morti per la natalità (o i nati per la mortalità)', cento: 'Moltiplicare per 100 invece che per 1000',
      mille: 'Dimenticare il × 1000', invertito: 'Mettere la popolazione al numeratore', saldo: 'Usare la differenza nati − morti al posto dei nati o dei morti',
      nonRapportato: 'Fermarsi al saldo senza rapportarlo alla popolazione', segno: 'Sbagliare incremento e decremento',
      tasso: 'Calcolare un tasso quando si chiede il numero di persone', calcolo: 'Sbagliare il calcolo'
    },
    opzioni: function () { return { v: 1 }; },
    serie: function (seme, n) { var r = rngDa(seme), usate = {}, out = []; for (var i = 0; i < n; i++) out.push(varianteTassi(r, i, usate)); return out; },
    domanda: function (v) {
      var d = disegnaTassi(v, {}), foglio = el('div'), c = {}, C = CHIEDI_T[v.chiede];
      foglio.appendChild(el('h4', { text: testoTassi(v) }));
      c.val = el('input', { class: 'esx-campo largo', inputmode: 'decimal', 'aria-label': 'Risultato', autocomplete: 'off' });
      c.X = el('span', { class: 'esx-giusto' });
      foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: v.chiede === 'inc' ? 'Incremento' : 'Tasso' }), c.val, el('span', { class: 'esx-unita', text: C.unita }), c.X]));
      if (v.chiede === 'inc' || v.chiede === 'tinc') {
        c.segno = segmentato([{ t: 'Incremento', v: '+' }, { t: 'Decremento', v: '-' }], 'È un incremento o un decremento?');
        c.segnoX = el('span', { class: 'esx-giusto' });
        foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'È un' }), c.segno, c.segnoX]));
        foglio.appendChild(el('p', { class: 'esx-nota', style: 'margin:-4px 0 10px', text: 'Se è un decremento, il numero è negativo: scrivi il segno meno.' }));
      }
      foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:12px 0 4px;line-height:1.4', text: 'Quali dati non servono per questo calcolo?' }));
      var chips = el('div', { class: 'esx-chips' }), righe = [];
      v.righe.forEach(function (k) {
        var cb = el('input', { type: 'checkbox' }), lab = el('label', null, [cb, el('span', { text: DATI_T[k].t })]);
        righe.push({ k: k, cb: cb, lab: lab }); chips.appendChild(lab);
      });
      foglio.appendChild(chips);
      return {
        nodo: d.nodo, foglio: foglio,
        leggi: function () {
          if (!c.val.value.trim()) { c.val.focus(); return null; }
          return { val: numero(c.val.value.replace('−', '-').replace(/\.(?=\d{3}(\D|$))/g, '')), segno: c.segno ? c.segno.valore() : null,
            scarti: righe.filter(function (x) { return x.cb.checked; }).map(function (x) { return x.k; }) };
        },
        segna: function (val) {
          c.val.disabled = true; c.val.classList.add(val.ok.val ? 'ok' : 'ko');
          if (!val.ok.val) c.X.textContent = val.giusto;
          if (c.segno) { c.segno.blocca(); c.segno.classList.add(val.ok.segno ? 'ok' : 'ko'); if (!val.ok.segno) c.segnoX.textContent = rispostaTassi(v) >= 0 ? 'incremento' : 'decremento'; }
          righe.forEach(function (x) {
            x.cb.disabled = true;
            var inutile = v.superflui.indexOf(x.k) >= 0;
            if (inutile) x.lab.classList.add('giusta'); else if (x.cb.checked) x.lab.classList.add('sbagliata');
          });
        },
        soluzione: function (anim) { d.api.soluzione(anim, Orologio()); }
      };
    },
    valuta: function (v, r) {
      var ok = {}, errori = [], ris = rispostaTassi(v), n = v.nati, m = v.morti, p = v.pop, x = r.val;
      function err(c, t) { errori.push({ c: c, t: t }); }
      function vicino(a, b, tol) { return !isNaN(a) && a !== null && Math.abs(a - b) <= (tol == null ? 0.051 : tol); }
      var tasso = v.chiede !== 'inc';
      ok.val = tasso ? vicino(x, ris) : vicino(x, ris, 0.5);
      var giusto = tasso ? permille(ris) : (ris > 0 ? '+' : '') + migliaia(ris);
      if (!ok.val) {
        var sop = v.chiede === 'nat' ? n : v.chiede === 'mor' ? m : n - m;
        if (v.chiede === 'nat' && vicino(x, m / p * 1000)) err('morti', 'Hai messo i morti: per la natalità al numeratore vanno i nati. ' + migliaia(n) + ' ÷ ' + migliaia(p) + ' × 1000 = ' + giusto + '.');
        else if (v.chiede === 'mor' && vicino(x, n / p * 1000)) err('morti', 'Hai messo i nati: per la mortalità al numeratore vanno i morti. ' + migliaia(m) + ' ÷ ' + migliaia(p) + ' × 1000 = ' + giusto + '.');
        else if (tasso && vicino(x, sop / p * 100)) err('cento', 'Hai moltiplicato per 100: è la percentuale. Per i tassi demografici si usa il per mille, × 1000: ' + giusto + '.');
        else if (tasso && vicino(x, sop / p, 0.0006)) err('mille', 'Manca il × 1000: ' + fmt(sop / p) + ' è un numero troppo piccolo da leggere. Moltiplicato per 1000 fa ' + giusto + '.');
        else if (tasso && sop !== 0 && vicino(x, p / sop * 1000, 1)) err('invertito', 'Hai messo la popolazione sopra. Il soggetto va al numeratore, la popolazione al denominatore: ' + giusto + '.');
        else if ((v.chiede === 'nat' || v.chiede === 'mor') && vicino(x, (n - m) / p * 1000)) err('saldo', 'Hai usato nati − morti: quello serve per l’incremento naturale. Qui basta ' + (v.chiede === 'nat' ? 'il numero dei nati' : 'il numero dei morti') + ': ' + giusto + '.');
        else if (v.chiede === 'tinc' && vicino(x, n - m, 0.5)) err('nonRapportato', migliaia(n - m) + ' è il saldo in persone. Il tasso lo mette in rapporto con la popolazione: ' + migliaia(n - m) + ' ÷ ' + migliaia(p) + ' × 1000 = ' + giusto + '.');
        else if (vicino(x, -ris, tasso ? 0.051 : 0.5) && ris !== 0) err('segno', 'Il numero è giusto ma il segno no: ' + (ris >= 0 ? 'i nati sono più dei morti, è positivo.' : 'i morti sono più dei nati, è negativo (decremento).'));
        else if (v.chiede === 'inc' && vicino(x, (n - m) / p * 1000)) err('tasso', 'Questo è il tasso per mille. L’incremento naturale si chiede in persone: ' + migliaia(n) + ' − ' + migliaia(m) + ' = ' + giusto + '.');
        else err('calcolo', tasso ? 'Il risultato è ' + giusto + '. Ricontrolla la divisione.' : 'Nati − morti = ' + migliaia(n) + ' − ' + migliaia(m) + ' = ' + giusto + '.');
      }
      ok.segno = true;
      if (v.chiede === 'inc' || v.chiede === 'tinc') {
        ok.segno = r.segno === (ris >= 0 ? '+' : '-');
        if (!ok.segno) err('segno', ris >= 0 ? 'I nati sono più dei morti: è un incremento.' : 'I morti sono più dei nati: è un decremento naturale.');
      }
      var scarti = r.scarti || [], serve = CHIEDI_T[v.chiede].serve;
      var scartatoUtile = scarti.filter(function (k) { return serve.indexOf(k) >= 0; });
      var mancati = v.superflui.filter(function (k) { return scarti.indexOf(k) < 0; });
      ok.scarti = !scartatoUtile.length && !mancati.length;
      if (scartatoUtile.length) err('scartato', 'Hai scartato un dato che serve: ' + scartatoUtile.map(function (k) { return DATI_T[k].t.toLowerCase(); }).join(', ') + '.');
      if (mancati.length) err('superfluo', 'Non servivano: ' + mancati.map(function (k) { return DATI_T[k].t.toLowerCase(); }).join(', ') + '. Vanno riconosciuti e lasciati da parte subito.');
      return { preso: ok.val && ok.segno && ok.scarti, errori: errori, ok: ok, giusto: giusto,
        nota: tasso ? 'Si accetta il risultato arrotondato a un decimale.' : '' };
    },
    procedimento: function (v) {
      function scena() { return disegnaTassi(v, {}); }
      var C = CHIEDI_T[v.chiede];
      var passi = [
        { scena: 's', titolo: 'Che cosa chiede', testo: 'Si chiede ' + C.t + '. Servono solo: ' + C.serve.map(function (k) { return DATI_T[k].t.toLowerCase(); }).join(', ') + '.', fai: function (a, an, t) { a.serve(an, t); } },
        { scena: 's', titolo: 'Via il dato superfluo', testo: 'Il resto non serve: ' + v.superflui.map(function (k) { return DATI_T[k].t.toLowerCase(); }).join(', ') + '. Si barra subito, così non finisce nella formula.',
          regola: 'Prima si scartano i dati inutili.', fai: function (a, an, t) { a.barra(an, t); } }
      ];
      passiCalcoloTassi(v).forEach(function (p) { p.scena = 's'; passi.push(p); });
      return { scena: scena, passi: passi };
    },
    // Il tutorial: l'esempio di aula, 100.000 abitanti, 1.000 nati e 900 morti in 12 mesi.
    tutorial: function (e) {
      var base = { luogo: 'Topolinia', pop: 100000, nati: 1000, morti: 900, righe: ['pop', 'nati', 'morti'] };
      function caso(chiede, righe, superflui) { var x = JSON.parse(JSON.stringify(base)); x.chiede = chiede; if (righe) x.righe = righe; x.superflui = superflui; return x; }
      var scene = {
        nat: caso('nat', null, ['morti']),
        mor: caso('mor', null, ['nati']),
        inc: caso('inc', null, ['pop']),
        tinc: caso('tinc', null, []),
        dec: { luogo: 'Paperopoli', pop: 50000, nati: 400, morti: 550, chiede: 'inc', righe: ['pop', 'nati', 'morti', 'sup'], sup: 84, superflui: ['pop', 'sup'] }
      };
      function scena(nome, opz) { return disegnaTassi(scene[nome], opz || {}); }
      var passi = [
        { scena: 'nat', stampa: 'testo', titolo: 'L’esercizio della prova', testo: ['Un comune, i dati di un anno, e una domanda: un tasso di natalità, di mortalità o l’incremento naturale.', 'Il trucco del docente: nel testo c’è sempre un dato che non serve. Va riconosciuto e lasciato da parte.'] },
        { scena: 'nat', stampa: true, titolo: 'Il tasso di natalità: quali dati', testo: ['L’esempio di aula: 100.000 abitanti, 1.000 nati e 900 morti in 12 mesi.', 'Per la natalità servono i nati e la popolazione. I 900 morti sono il dato superfluo.'],
          fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'nat', stampa: true, titolo: 'Il calcolo', testo: ['I nati, il soggetto, vanno al numeratore; la popolazione al denominatore.', '1.000 ÷ 100.000 = 0,01: troppo piccolo da leggere. Per questo si moltiplica per 1000: 10 nati ogni mille abitanti, 10‰.'],
          regola: 'Tasso = soggetto ÷ popolazione × 1000.', extra: function () { return formulaTasso('1.000', '100.000', '10‰', true); }, fai: function (a, an, t) { a.soluzione(false, t); } },
        { scena: 'mor', stampa: 'testo', titolo: 'La mortalità', testo: 'Stesso schema con i morti: 900 ÷ 100.000 × 1000 = 9‰. Qui il dato superfluo sono i nati.',
          extra: function () { return formulaTasso('900', '100.000', '9‰', true); }, fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'inc', stampa: 'testo', titolo: 'L’incremento naturale', testo: ['Nati − morti: 1.000 − 900 = +100 persone. È un numero di persone, non un tasso.', 'Qui la popolazione non serve.'],
          regola: 'Incremento naturale = nati − morti.', fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'tinc', stampa: 'testo', titolo: 'Non fermarti al saldo', testo: ['Se si chiede il tasso di incremento, il saldo va messo in rapporto con gli abitanti: 100 ÷ 100.000 × 1000 = 1‰.', 'È l’errore che il docente vede: calcolare +100 e fermarsi.'],
          extra: function () { return formulaTasso('100', '100.000', '1‰', true); }, fai: function (a, an, t) { a.serve(an, t); } },
        { scena: 'dec', stampa: true, titolo: 'Quando i morti sono di più', testo: ['A Paperopoli: 400 nati e 550 morti. 400 − 550 = −150: il segno meno dice che è un decremento naturale.', 'Superficie e popolazione qui non servono.'],
          regola: 'Morti più dei nati: decremento, numero negativo.', fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'nat', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Leggi che cosa chiede. 2. Scarta i dati che non servono. 3. Soggetto al numeratore, popolazione al denominatore, × 1000. 4. Per l’incremento: nati − morti, con il segno.', 'Ora prova tu: 15 comuni sempre diversi.'],
          dopo: function () { return docente(e); }, fai: function (a, an, t) { a.soluzione(false, t); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni comune fai il calcolo richiesto e barra i dati che non servono. I tassi si esprimono per mille (‰). Se nati e morti danno un decremento, scrivi il segno meno.</p>',
    stampa: function (v, n) {
      var d = disegnaTassi(v, { stampa: true, fs: 17, larghezza: '86mm' }), C = CHIEDI_T[v.chiede];
      return '<h3>' + n + '. ' + esc(testoTassi(v)) + '</h3><div class="riga">' + d.nodo.outerHTML + '<div class="risp">' +
        (v.chiede === 'inc' ? 'Incremento naturale: ________ persone' : 'Tasso: ________ ‰') + '<br>' +
        (v.chiede === 'inc' || v.chiede === 'tinc' ? 'Incremento &#9744; &nbsp; Decremento &#9744;<br>' : '') +
        'Dati che non servono: ____________________<br>Calcolo: ____________________</div></div>';
    },
    soluzioni: function (vs) {
      return '<table><tr><th>N.</th><th>Calcolo</th><th>Risultato</th><th>Dati che non servono</th></tr>' + vs.map(function (v, i) {
        var ris = rispostaTassi(v), n = v.nati, m = v.morti, p = v.pop, calc;
        if (v.chiede === 'nat') calc = migliaia(n) + ' ÷ ' + migliaia(p) + ' × 1000';
        else if (v.chiede === 'mor') calc = migliaia(m) + ' ÷ ' + migliaia(p) + ' × 1000';
        else if (v.chiede === 'inc') calc = migliaia(n) + ' − ' + migliaia(m);
        else calc = '(' + migliaia(n) + ' − ' + migliaia(m) + ') ÷ ' + migliaia(p) + ' × 1000';
        var rs = v.chiede === 'inc' ? (ris > 0 ? '+' : '') + migliaia(ris) + ' persone (' + (ris >= 0 ? 'incremento' : 'decremento') + ')'
          : permille(ris) + (v.chiede === 'tinc' ? ' (' + (ris >= 0 ? 'incremento' : 'decremento') + ')' : '');
        return '<tr><td>' + (i + 1) + '</td><td>' + calc + '</td><td><b>' + rs + '</b></td><td>' + v.superflui.map(function (k) { return esc(DATI_T[k].t); }).join(', ') + '</td></tr>';
      }).join('') + '</table>';
    }
  };

  /* =================================================================
     5. DALLA TABELLA AL GRAFICO
     Dalle lezioni 4 e 5: assi cartesiani con il tempo in orizzontale e
     l'intensità in verticale; il grafico a linee, con l'annata senza
     dato saltata e i punti uniti da una linea tratteggiata; l'istogramma
     a canne verticali per confrontare maschi e femmine (esempio di aula:
     15 maschi e 18 femmine, poi 20 maschi e 16 femmine dopo 5 anni).
     ================================================================= */
  var COL_M = '#2350A0', COL_F = '#B4634D';
  var SOGGETTI_LIN = [
    { t: 'Alunni iscritti alla scuola di ', u: [5, 10], unita: 'alunni' },
    { t: 'Abitanti di ', u: [1, 2], unita: 'migliaia di abitanti', migliaia: true },
    { t: 'Turisti arrivati a ', u: [1, 2], unita: 'migliaia di turisti', migliaia: true },
    { t: 'Botteghe artigiane di ', u: [2, 5], unita: 'botteghe' },
    { t: 'Ettari coltivati a grano a ', u: [10, 20], unita: 'ettari' }
  ];
  var PIANO_G = ['lin', 'ist', 'lin', 'lin', 'ist', 'lin', 'ist', 'lin', 'lin', 'ist', 'lin', 'ist', 'lin', 'lin', 'ist'];
  var GAP_G = { 3: 1, 5: 1, 8: 1, 10: 1, 13: 1 };

  function varianteGrafico(r, i, usate) {
    var nomi = IMMAGINARIE.filter(function (x) { return !usate[x]; });
    var luogo = rpick(r, nomi.length ? nomi : IMMAGINARIE); usate[luogo] = true;
    var v = { tipo: PIANO_G[i % PIANO_G.length], luogo: luogo, gap: -1 };
    if (v.tipo === 'lin') {
      var S = rpick(r, SOGGETTI_LIN), u = rpick(r, S.u), passo = rpick(r, [5, 10]), n = rint(r, 5, 7);
      var inizio = passo === 10 ? rint(r, 190, 196) * 10 + 1 : rint(r, 392, 400) * 5;
      if (inizio + passo * (n - 1) > 2025) inizio = 2025 - passo * (n - 1);
      v.anni = []; for (var k = 0; k < n; k++) v.anni.push(String(inizio + k * passo));
      var x = rint(r, 6, 18), valori = [];
      for (k = 0; k < n; k++) { x = Math.max(4, Math.min(28, x + rint(r, -4, 5))); valori.push(x * u); }
      if (GAP_G[i]) v.gap = rint(r, 1, n - 2);
      if (v.gap >= 0) valori[v.gap] = null;
      v.titolo = S.t + luogo + (S.migliaia ? ' (in migliaia)' : '');
      v.unita = S.unita; v.u = u;
      v.serie = [{ nome: S.unita.charAt(0).toUpperCase() + S.unita.slice(1), col: COL_M, valori: valori }];
    } else {
      var m = rint(r, 3, 4), p5 = rint(r, 397, 401) * 5;
      v.anni = []; for (var j = 0; j < m; j++) v.anni.push(String(p5 + j * 5));
      function serie() { var a = []; for (var q = 0; q < m; q++) a.push(rint(r, 8, 28)); return a; }
      var M = serie(), F = serie();
      for (j = 0; j < m; j++) if (M[j] === F[j]) F[j] = M[j] + (F[j] < 28 ? 1 : -1);
      v.titolo = 'Alunni della scuola di ' + luogo + ': maschi e femmine';
      v.unita = 'alunni'; v.u = 1;
      v.serie = [{ nome: 'Maschi', col: COL_M, valori: M }, { nome: 'Femmine', col: COL_F, valori: F }];
    }
    var tutti = []; v.serie.forEach(function (s) { s.valori.forEach(function (x) { if (x != null) tutti.push(x); }); });
    v.max = Math.max(15 * v.u, Math.ceil((Math.max.apply(null, tutti) + v.u) / (5 * v.u)) * 5 * v.u);
    return v;
  }

  // a schermo la tabella va in verticale (un anno per riga), su carta in orizzontale
  function tabellaVerticale(v) {
    var th = '<th style="text-align:left;padding:5px 10px;border-bottom:1px solid var(--dust);color:var(--ink)">';
    var td = '<td style="padding:5px 10px;text-align:right;border-bottom:1px solid var(--dust);font-variant-numeric:tabular-nums">';
    var h = '<table style="border-collapse:collapse;font-size:.95rem;margin:2px 0 12px"><tr>' + th + 'Anno</th>' + v.serie.map(function (s) { return th.replace('text-align:left', 'text-align:right') + esc(s.nome) + '</th>'; }).join('') + '</tr>';
    v.anni.forEach(function (a, i) {
      h += '<tr>' + td.replace('text-align:right', 'text-align:left') + a + '</td>' + v.serie.map(function (s) { var x = s.valori[i]; return td + (x == null ? '<i>non rilevato</i>' : migliaia(x)) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</table>';
  }
  function tabellaGrafico(v, stampa) {
    var th = '<th style="text-align:left;padding:4px 8px;border-bottom:1px solid ' + (stampa ? '#999' : 'var(--dust)') + '">';
    var td = '<td style="padding:4px 8px;text-align:center;border-bottom:1px solid ' + (stampa ? '#ddd' : 'var(--dust)') + '">';
    var h = '<table style="border-collapse:collapse;font-size:' + (stampa ? '9.5pt' : '.95rem') + ';margin:4px 0 10px"><tr>' + th + 'Anno</th>' +
      v.anni.map(function (a) { return th.replace('text-align:left', 'text-align:center') + a + '</th>'; }).join('') + '</tr>';
    v.serie.forEach(function (s) {
      h += '<tr>' + th + esc(s.nome) + '</th>' + s.valori.map(function (x) { return td + (x == null ? '<i>non rilevato</i>' : migliaia(x)) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</table>';
  }

  // Disegna gli assi e, se opz.valori, il grafico. Ritorna { nodo, api }.
  function disegnaGrafico(v, opz) {
    opz = opz || {};
    var stampa = !!opz.stampa, FS = opz.fs || (stretto() ? 26 : 15);
    var W = 620, H = !stampa && stretto() ? 640 : 400, L = FS * 4.2, R = 18, T = 34, B = FS * 3.6;
    var PW = W - L - R, PH = H - T - B, n = v.anni.length, colW = PW / n, ist = v.tipo === 'ist';
    var g = { L: L, T: T, PW: PW, PH: PH, colW: colW,
      x: function (i, s) { var c = L + colW * (i + 0.5); return ist ? c + (s === 0 ? -1 : 1) * colW * 0.17 : c; },
      y: function (val) { return T + PH - val / v.max * PH; } };
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', width: opz.larghezza || null, tabindex: opz.interattivo ? '0' : null,
      'aria-label': opz.interattivo ? 'Piano cartesiano da completare: ' + v.titolo + '. Tocca una colonna all’altezza del valore.' : 'Grafico: ' + v.titolo });
    var griglia = sv('g'), sotto = sv('g'), assi = sv('g'), utente = sv('g'), sopra = sv('g');
    [griglia, sotto, assi, utente, sopra].forEach(function (x) { svg.appendChild(x); });
    var inch = stampa ? '#000' : INCH, fine = stampa ? '#ccc' : 'rgba(139,110,75,.28)', medio = stampa ? '#999' : 'rgba(139,110,75,.6)';
    var minori = v.max / v.u <= 50;
    for (var q = 0; q <= v.max; q += v.u) {
      if (!minori && q % (5 * v.u)) continue;
      var maggiore = q % (5 * v.u) === 0, yy = g.y(q);
      griglia.appendChild(sv('line', { x1: L, y1: yy, x2: L + PW, y2: yy, stroke: maggiore ? medio : fine, 'stroke-width': maggiore ? 1 : .7 }));
      if (maggiore && !opz.senzaEtichette) assi.appendChild(sv('text', { x: L - 8, y: yy + FS * 0.35, 'text-anchor': 'end', 'font-size': FS - 1, fill: inch }, migliaia(q)));
    }
    assi.appendChild(sv('line', { x1: L, y1: T - 14, x2: L, y2: T + PH, stroke: inch, 'stroke-width': 2 }));
    assi.appendChild(sv('line', { x1: L, y1: T + PH, x2: L + PW + 8, y2: T + PH, stroke: inch, 'stroke-width': 2 }));
    assi.appendChild(sv('path', { d: 'M ' + L + ' ' + (T - 20) + ' l -5 10 l 10 0 z', fill: inch }));
    assi.appendChild(sv('path', { d: 'M ' + (L + PW + 14) + ' ' + (T + PH) + ' l -10 -5 l 0 10 z', fill: inch }));
    var etAnni = [];
    if (!opz.senzaEtichette) v.anni.forEach(function (a, i) {
      var tx = sv('text', { x: L + colW * (i + 0.5), y: T + PH + FS + 8, 'text-anchor': 'middle', 'font-size': FS, fill: inch }, a);
      assi.appendChild(tx); etAnni.push(tx);
      assi.appendChild(sv('line', { x1: L + colW * (i + 0.5), y1: T + PH, x2: L + colW * (i + 0.5), y2: T + PH + 5, stroke: inch }));
    });
    if (!opz.senzaEtichette) {
      assi.appendChild(sv('text', { x: L + PW, y: T + PH + FS * 2.6 + 6, 'text-anchor': 'end', 'font-size': FS - 2, 'font-style': 'italic', fill: stampa ? '#444' : SEPPIA }, 'tempo (anni) →'));
      assi.appendChild(sv('text', { x: L + 6, y: T - 8, 'font-size': FS - 2, 'font-style': 'italic', fill: stampa ? '#444' : SEPPIA }, '↑ ' + v.unita));
    }
    if (ist && !opz.senzaEtichette) v.serie.forEach(function (s, k) {
      var lx = L + PW - 190 + k * 100;
      assi.appendChild(sv('rect', { x: lx, y: T - 26, width: 14, height: 14, fill: s.col }));
      assi.appendChild(sv('text', { x: lx + 20, y: T - 14, 'font-size': FS - 2, fill: inch }, s.nome));
    });

    // il grafico di un insieme di valori: punti e linea, oppure canne
    function traccia2(gruppo, valori, stile, anim, t, perPunto, conValori) {
      var bw = colW * 0.3, k = 0;
      valori.forEach(function (vs, s) {
        var col = v.serie[s].col, prima = null;
        vs.forEach(function (x, i) {
          if (x == null) return;
          var px = g.x(i, s), py = g.y(x), nodo;
          if (ist) {
            nodo = sv('rect', { x: px - bw / 2, y: py, width: bw, height: T + PH - py, fill: stile.vuoto ? 'none' : col, 'fill-opacity': stile.vuoto ? null : (stile.chiaro ? .35 : .9), stroke: col, 'stroke-width': stile.vuoto ? 2.4 : 1, 'stroke-dasharray': stile.vuoto ? '6 4' : null });
          } else {
            if (prima) {
              var buco = i - prima.i > 1, tratt = buco && stile.gap === 'tratteggiata';
              var seg = sv('line', { x1: prima.x, y1: prima.y, x2: px, y2: py, stroke: col, 'stroke-width': 3, 'stroke-dasharray': tratt ? '9 7' : (stile.vuoto ? '6 4' : null), opacity: stile.vuoto ? .8 : 1 });
              gruppo.appendChild(seg); traccia(seg, anim, t, 120 + k * (perPunto || 0), 450);
            }
            nodo = sv('circle', { cx: px, cy: py, r: 7, fill: stile.vuoto ? '#fff' : col, stroke: col, 'stroke-width': 2.4 });
            prima = { i: i, x: px, y: py };
          }
          gruppo.appendChild(nodo); appariDopo(nodo, anim, t, 80 + k * (perPunto || 0));
          if (conValori) {
            var lab = sv('text', { x: px, y: py - 12, 'text-anchor': 'middle', 'font-size': FS - 2, 'font-weight': 700, fill: col, stroke: stampa ? '#fff' : CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, migliaia(x));
            gruppo.appendChild(lab); appariDopo(lab, anim, t, 160 + k * (perPunto || 0));
          }
          k++;
        });
      });
    }
    var giusti = v.serie.map(function (s) { return s.valori; });
    var api = {
      v: v, g: g, svg: svg,
      assi: function (anim, t) {
        var a = sv('line', { x1: L, y1: T + PH, x2: L + PW, y2: T + PH, stroke: ORO, 'stroke-width': 7, opacity: .8 });
        var b = sv('line', { x1: L, y1: T + PH, x2: L, y2: T, stroke: ORO, 'stroke-width': 7, opacity: .8 });
        sotto.appendChild(a); sotto.appendChild(b); traccia(a, anim, t, 80, 600); traccia(b, anim, t, 800, 600);
      },
      scala: function (anim, t) {
        var y1 = g.y(0), y2 = g.y(v.u), x = L + 4;
        var rr = sv('rect', { x: L, y: y2, width: PW, height: y1 - y2, fill: 'rgba(200,169,110,.35)' });
        sotto.appendChild(rr); appariDopo(rr, anim, t, 100);
        var tx = sv('text', { x: x + 6, y: y2 - 6, 'font-size': FS - 1, 'font-weight': 700, fill: SEPPIA, stroke: CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, 'ogni linea sottile = ' + migliaia(v.u));
        sopra.appendChild(tx); appariDopo(tx, anim, t, 300);
      },
      buco: function (anim, t) {
        if (v.gap < 0) return;
        var c = sv('rect', { x: L + colW * v.gap + 4, y: T, width: colW - 8, height: PH, fill: 'rgba(179,38,30,.08)', stroke: ROSSO, 'stroke-width': 1.4, 'stroke-dasharray': '5 4' });
        sotto.appendChild(c); appariDopo(c, anim, t, 100);
        var tx = sv('text', { x: L + colW * (v.gap + 0.5), y: T + PH / 2, 'text-anchor': 'middle', 'font-size': FS - 2, 'font-style': 'italic', fill: ROSSO, stroke: CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, 'nessun dato');
        sopra.appendChild(tx); appariDopo(tx, anim, t, 300);
      },
      riporta: function (anim, t) {
        if (ist) traccia2(sopra, giusti, {}, anim, t, 380, true);
        else v.serie.forEach(function (s) {
            s.valori.forEach(function (x, i) {
              if (x == null) return;
              var c = sv('circle', { cx: g.x(i, 0), cy: g.y(x), r: 7, fill: s.col }), lab = sv('text', { x: g.x(i, 0), y: g.y(x) - 12, 'text-anchor': 'middle', 'font-size': FS - 2, 'font-weight': 700, fill: s.col, stroke: CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, migliaia(x));
              var guida = sv('line', { x1: L, y1: g.y(x), x2: g.x(i, 0), y2: g.y(x), stroke: s.col, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: .6 });
              sotto.appendChild(guida); sopra.appendChild(c); sopra.appendChild(lab);
              traccia(guida, anim, t, 100 + i * 380, 300); appariDopo(c, anim, t, 300 + i * 380); appariDopo(lab, anim, t, 380 + i * 380);
            });
          });
      },
      collega: function (anim, t) { if (!ist) traccia2(sotto, giusti, { gap: 'tratteggiata' }, anim, t, 300, false); },
      soluzione: function (anim, t, vuoto) { traccia2(sopra, giusti, { gap: 'tratteggiata', vuoto: !!vuoto }, anim, t, 0, !vuoto); },
      utente: function (valori, stile, sel) {
        while (utente.firstChild) utente.removeChild(utente.firstChild);
        traccia2(utente, valori, { gap: stile }, false, null, 0, false);
        if (sel) {
          var cx = ist ? g.x(sel.i, sel.s) : g.x(sel.i, 0), w = ist ? colW * 0.38 : colW * 0.6;
          utente.appendChild(sv('rect', { x: cx - w / 2, y: T, width: w, height: PH, fill: 'rgba(200,169,110,.14)', stroke: ORO, 'stroke-width': 1.5, rx: 4 }));
        }
      },
      punto: function (cx, cy) {
        // da coordinate dello schermo a colonna, serie e valore
        var pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
        var m = svg.getScreenCTM(); if (!m) return null;
        var p = pt.matrixTransform(m.inverse());
        if (p.x < L || p.x > L + PW || p.y < T - 10 || p.y > T + PH + 10) return null;
        var i = Math.max(0, Math.min(n - 1, Math.floor((p.x - L) / colW)));
        var s = ist ? (p.x < L + colW * (i + 0.5) ? 0 : 1) : 0;
        var val = Math.round((T + PH - p.y) / PH * v.max / v.u) * v.u;
        return { i: i, s: s, val: Math.max(0, Math.min(v.max, val)) };
      }
    };
    if (opz.valori) traccia2(sopra, giusti, { gap: 'tratteggiata' }, false, null, 0, !!opz.conValori);
    return { nodo: svg, api: api };
  }

  var GRAFICO = {
    nomiErrori: {
      assi: 'Mettere il tempo sull’asse verticale', mancante: 'Lasciare fuori un dato', valore: 'Riportare un valore all’altezza sbagliata',
      lettura: 'Sbagliare di una linea nella lettura della scala', scambio: 'Scambiare le due serie (maschi e femmine)',
      riempito: 'Inventare un valore per l’anno senza dato', continua: 'Unire con una linea continua anche dove manca il dato'
    },
    opzioni: function () { return { v: 1 }; },
    serie: function (seme, n) { var r = rngDa(seme), usate = {}, out = []; for (var i = 0; i < n; i++) out.push(varianteGrafico(r, i, usate)); return out; },
    domanda: function (v) {
      var d = disegnaGrafico(v, { interattivo: true }), foglio = el('div'), c = {}, ist = v.tipo === 'ist';
      var valori = v.serie.map(function (s) { return s.valori.map(function () { return null; }); });
      var sel = null, bloccato = false;
      foglio.appendChild(el('h4', { text: (ist ? 'Costruisci l’istogramma: ' : 'Costruisci il grafico a linee: ') + v.titolo }));
      foglio.appendChild(el('div', { html: tabellaVerticale(v) }));
      c.assi = segmentato([{ t: 'Il tempo (gli anni)', v: 'tempo' }, { t: 'L’intensità (i valori)', v: 'int' }], 'Che cosa va sull’asse orizzontale?');
      foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'In orizzontale' }), c.assi]));
      if (v.gap >= 0) {
        c.gap = segmentato([{ t: 'Linea continua', v: 'continua' }, { t: 'Linea tratteggiata', v: 'tratteggiata' }], 'Come unisci i punti attorno all’anno senza dato?');
        c.gap.addEventListener('click', disegna);
        foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:10px 0 6px;line-height:1.4', text: 'Nel ' + v.anni[v.gap] + ' il dato non è stato rilevato. Come unisci il ' + v.anni[v.gap - 1] + ' con il ' + v.anni[v.gap + 1] + '?' }));
        foglio.appendChild(el('div', { class: 'esx-riga' }, [c.gap]));
      }
      var stato = el('span', { class: 'esx-nota', style: 'margin:0;min-width:10em' });
      var meno = el('button', { type: 'button', class: 'esx-btn sec pic', text: '−', 'aria-label': 'Abbassa di una linea' });
      var piu = el('button', { type: 'button', class: 'esx-btn sec pic', text: '+', 'aria-label': 'Alza di una linea' });
      var togli = el('button', { type: 'button', class: 'esx-btn sec pic', text: 'Togli' });
      foglio.appendChild(el('div', { class: 'esx-comandi', style: 'margin-top:10px' }, [stato, meno, piu, togli]));
      foglio.appendChild(el('p', { class: 'esx-nota', text: (ist ? 'Tocca la colonna dell’anno, a sinistra per i maschi e a destra per le femmine, ' : 'Tocca la colonna dell’anno ') +
        'all’altezza del valore. Ogni linea sottile vale ' + migliaia(v.u) + '. Con − e + ritocchi l’ultimo che hai messo.' }));
      function nomeSel() { return sel ? v.anni[sel.i] + (ist ? ' · ' + v.serie[sel.s].nome : '') + ': ' + (valori[sel.s][sel.i] == null ? 'vuoto' : migliaia(valori[sel.s][sel.i])) : 'Nessuna colonna scelta'; }
      function disegna() { d.api.utente(valori, c.gap ? c.gap.valore() : 'continua', bloccato ? null : sel); stato.textContent = nomeSel(); }
      function metti(s, i, val) { if (bloccato) return; sel = { s: s, i: i }; valori[s][i] = val; disegna(); }
      d.nodo.addEventListener('click', function (ev) { var p = d.api.punto(ev.clientX, ev.clientY); if (p) metti(p.s, p.i, p.val); });
      function ritocca(dx) {
        if (!sel || bloccato) return;
        var x = valori[sel.s][sel.i]; x = (x == null ? 0 : x) + dx * v.u;
        metti(sel.s, sel.i, Math.max(0, Math.min(v.max, x)));
      }
      meno.addEventListener('click', function () { ritocca(-1); });
      piu.addEventListener('click', function () { ritocca(1); });
      togli.addEventListener('click', function () { if (sel && !bloccato) { valori[sel.s][sel.i] = null; disegna(); } });
      d.nodo.addEventListener('keydown', function (ev) {
        if (bloccato) return;
        if (!sel) sel = { s: 0, i: 0 };
        var k = ev.key, ser = v.serie.length;
        if (k === 'ArrowUp') ritocca(1);
        else if (k === 'ArrowDown') ritocca(-1);
        else if (k === 'ArrowRight' || k === 'ArrowLeft') {
          var idx = sel.i * ser + sel.s + (k === 'ArrowRight' ? 1 : -1), tot = v.anni.length * ser;
          idx = (idx + tot) % tot; sel = { s: idx % ser, i: Math.floor(idx / ser) }; disegna();
        } else if (k === 'Delete' || k === 'Backspace') { valori[sel.s][sel.i] = null; disegna(); }
        else return;
        ev.preventDefault(); ev.stopPropagation();
      });
      disegna();
      return {
        nodo: d.nodo, foglio: foglio,
        leggi: function () {
          var messi = 0; valori.forEach(function (vs) { vs.forEach(function (x) { if (x != null) messi++; }); });
          if (!messi) { stato.textContent = 'Prima riporta i valori sul grafico.'; return null; }
          return { assi: c.assi.valore(), gap: c.gap ? c.gap.valore() : null, valori: JSON.parse(JSON.stringify(valori)) };
        },
        segna: function (val) {
          bloccato = true; disegna();
          c.assi.blocca(); c.assi.classList.add(val.ok.assi ? 'ok' : 'ko');
          if (c.gap) { c.gap.blocca(); c.gap.classList.add(val.ok.gap ? 'ok' : 'ko'); }
          [meno, piu, togli].forEach(function (b) { b.disabled = true; });
          stato.textContent = val.preso ? 'Grafico giusto.' : 'In blu tratteggiato il grafico giusto.';
        },
        soluzione: function (anim) { d.api.soluzione(anim, Orologio(), true); }
      };
    },
    valuta: function (v, r) {
      var ok = { assi: r.assi === 'tempo', gap: true }, errori = [], tuttiOk = true, visti = {};
      function err(c, t) { if (!visti[t]) { errori.push({ c: c, t: t }); visti[t] = 1; } }
      if (!ok.assi) err('assi', 'Il tempo va sempre sull’asse orizzontale, l’intensità del fenomeno su quello verticale.');
      var ist = v.tipo === 'ist';
      var scambiati = ist && v.anni.every(function (_a, i) { return r.valori[0][i] === v.serie[1].valori[i] && r.valori[1][i] === v.serie[0].valori[i]; });
      if (scambiati) err('scambio', 'Hai scambiato maschi e femmine: a sinistra i maschi, a destra le femmine, come nella legenda.');
      v.serie.forEach(function (s, k) {
        s.valori.forEach(function (x, i) {
          var u = r.valori[k][i], dove = v.anni[i] + (ist ? ' (' + s.nome.toLowerCase() + ')' : '');
          if (x == null) {
            if (u != null) { tuttiOk = false; err('riempito', 'Nel ' + v.anni[i] + ' il dato non c’è: quell’annata si salta, non si inventa un valore.'); }
            return;
          }
          if (u == null) { tuttiOk = false; err('mancante', dove + ': manca il valore, ' + migliaia(x) + '.'); return; }
          if (u !== x) {
            tuttiOk = false;
            if (scambiati) return;
            if (Math.abs(u - x) === v.u) err('lettura', dove + ': ' + migliaia(x) + ', non ' + migliaia(u) + '. Conta le linee sottili: ognuna vale ' + migliaia(v.u) + '.');
            else err('valore', dove + ': il valore è ' + migliaia(x) + ', l’hai messo a ' + migliaia(u) + '.');
          }
        });
      });
      if (v.gap >= 0) {
        ok.gap = r.gap === 'tratteggiata';
        if (!ok.gap) err('continua', 'Dove manca il dato i due punti si uniscono con una linea tratteggiata: una linea continua farebbe credere che il dato ci sia.');
      }
      return { preso: tuttiOk && ok.assi && ok.gap && !scambiati, errori: errori, ok: ok,
        nota: 'Per il punto contano gli assi, ogni valore all’altezza giusta' + (v.gap >= 0 ? ' e la linea tratteggiata dove manca il dato.' : '.') };
    },
    procedimento: function (v) {
      function scena() { return disegnaGrafico(v, {}); }
      var ist = v.tipo === 'ist';
      var passi = [
        { scena: 's', titolo: 'Gli assi', testo: 'Il tempo, cioè gli anni, va in orizzontale. In verticale l’intensità del fenomeno: qui ' + v.unita + '.', regola: 'Tempo in orizzontale, intensità in verticale.', fai: function (a, an, t) { a.assi(an, t); } },
        { scena: 's', titolo: 'La scala', testo: 'Ogni linea sottile vale ' + migliaia(v.u) + ', ogni linea più marcata ' + migliaia(5 * v.u) + '. Si conta da zero.', fai: function (a, an, t) { a.scala(an, t); } },
        { scena: 's', titolo: ist ? 'Le canne' : 'I punti', testo: ist ? 'Per ogni anno due canne affiancate: maschi a sinistra, femmine a destra, con colori diversi e la legenda.' : 'Per ogni anno un punto all’altezza del valore.' + (v.gap >= 0 ? ' Nel ' + v.anni[v.gap] + ' il dato manca: niente punto.' : ''),
          fai: function (a, an, t) { if (v.gap >= 0) a.buco(an, t); a.riporta(an, t); } }
      ];
      if (!ist) passi.push({ scena: 's', titolo: v.gap >= 0 ? 'Si uniscono i punti, e il buco si tratteggia' : 'Si uniscono i punti', testo: v.gap >= 0 ? 'I punti si uniscono in ordine. Tra il ' + v.anni[v.gap - 1] + ' e il ' + v.anni[v.gap + 1] + ' la linea è tratteggiata: chi legge capisce subito che il ' + v.anni[v.gap] + ' non è stato rilevato.' : 'I punti si uniscono in ordine di tempo: la linea mostra l’andamento.',
        regola: v.gap >= 0 ? 'Dato mancante: si salta l’annata e si tratteggia.' : null, fai: function (a, an, t) { a.collega(an, t); } });
      return { scena: scena, passi: passi };
    },
    // Il tutorial: l'esempio di aula (maschi e femmine di una scuola) e un censimento saltato per la guerra.
    tutorial: function (e) {
      var guerra = { tipo: 'lin', luogo: 'Paperopoli', titolo: 'Abitanti di Paperopoli (in migliaia)', unita: 'migliaia di abitanti', u: 1, max: 25,
        anni: ['1911', '1921', '1931', '1941', '1951', '1961'], gap: 3, serie: [{ nome: 'Abitanti', col: COL_M, valori: [12, 14, 15, null, 17, 21] }] };
      var aula = { tipo: 'ist', luogo: 'Topolinia', titolo: 'Alunni della scuola di Topolinia: maschi e femmine', unita: 'alunni', u: 1, max: 25, gap: -1,
        anni: ['2020', '2025'], serie: [{ nome: 'Maschi', col: COL_M, valori: [15, 20] }, { nome: 'Femmine', col: COL_F, valori: [18, 16] }] };
      var scene = { guerra: guerra, aula: aula };
      function scena(nome, opz) { return disegnaGrafico(scene[nome], opz || {}); }
      var passi = [
        { scena: 'guerra', stampa: 'testo', momentaneo: true, titolo: 'Dalla tabella al grafico', testo: ['L’esercizio dà una tabella di numeri e chiede di trasformarla in un grafico: è il passaggio dal dato numerico alla forma visiva.', 'Qui gli abitanti di Paperopoli ai censimenti, in migliaia.'] },
        { scena: 'guerra', stampa: true, titolo: 'Primo: gli assi', testo: ['Si traccia il quadrante degli assi cartesiani.', 'In orizzontale il tempo, gli anni. In verticale l’intensità del fenomeno, qui le migliaia di abitanti.'],
          regola: 'Tempo in orizzontale, intensità in verticale.', fai: function (a, an, t) { a.assi(an, t); } },
        { scena: 'guerra', stampa: 'testo', momentaneo: true, titolo: 'La scala', testo: 'Sull’asse verticale si parte da zero e si sceglie quanto vale ogni linea: qui ogni linea sottile vale mille abitanti, ogni linea marcata cinquemila.', fai: function (a, an, t) { a.scala(an, t); } },
        { scena: 'guerra', stampa: true, titolo: 'Si riportano i dati', testo: ['Per ogni anno un punto all’altezza del suo valore: 12 nel 1911, 14 nel 1921, 15 nel 1931.', 'Nel 1941 il dato non c’è: come in Italia, dove quell’anno il censimento non si fece per la guerra. Niente punto.'],
          fai: function (a, an, t) { a.buco(an, t); a.riporta(an, t); } },
        { scena: 'guerra', stampa: true, titolo: 'Il buco si tratteggia', testo: ['I punti si uniscono in ordine. Tra il 1931 e il 1951 la linea è tratteggiata, non continua.', 'Una linea continua farebbe credere che il dato del 1941 esista. Il tratteggio dice: qui non è stato rilevato.'],
          regola: 'Annata senza dato: si salta e si unisce con il tratteggio.', fai: function (a, an, t) { a.collega(an, t); } },
        { scena: 'aula', stampa: true, titolo: 'L’istogramma: maschi e femmine', testo: ['L’esempio di aula: in una scuola 15 maschi e 18 femmine, cinque anni dopo 20 maschi e 16 femmine.', 'Per confrontare due gruppi nello stesso anno si usano canne verticali affiancate, di colore diverso, con la legenda.'],
          fai: function (a, an, t) { a.assi(false, t); a.riporta(an, t); } },
        { scena: 'aula', stampa: 'testo', titolo: 'Canne orizzontali? Solo per le piramidi', testo: ['Le canne orizzontali ai due lati di un asse, come nella piramide della popolazione, servono solo per confrontare due fenomeni simmetrici, come maschi e femmine per età.', 'Il docente consiglia grafici semplici, facili da rifare con una classe.'] },
        { scena: 'guerra', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Assi: tempo in orizzontale, intensità in verticale. 2. Scala da zero, con linee che valgono sempre lo stesso. 3. Riporta ogni dato. 4. Linea per l’andamento, canne affiancate per i confronti. 5. Annata senza dato: niente punto e tratteggio.', 'Ora prova tu: 15 tabelle sempre diverse.'],
          dopo: function () { return docente(e); }, fai: function (a, an, t) { a.soluzione(false, t); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni tabella disegna gli assi (tempo in orizzontale, intensità in verticale), scegli la scala e costruisci il grafico: a linee se c’è una sola serie, a canne verticali affiancate per maschi e femmine. Se un anno non ha il dato, saltalo e unisci i punti con una linea tratteggiata.</p>',
    stampa: function (v, n) {
      var vuoto = JSON.parse(JSON.stringify(v));
      var d = disegnaGrafico(vuoto, { stampa: true, fs: 15, larghezza: '100mm', senzaEtichette: true });
      return '<h3>' + n + '. ' + esc(v.titolo) + (v.tipo === 'ist' ? ' (istogramma)' : ' (grafico a linee)') + '</h3>' + tabellaGrafico(v, true) + '<div class="riga">' + d.nodo.outerHTML + '</div>';
    },
    soluzioni: function (vs) {
      return '<div style="display:flex;flex-wrap:wrap;gap:8px">' + vs.map(function (v, i) {
        var d = disegnaGrafico(v, { stampa: true, fs: 15, larghezza: '86mm', valori: true, conValori: true });
        return '<div style="break-inside:avoid;page-break-inside:avoid"><b>' + (i + 1) + '.</b>' + (v.gap >= 0 ? ' <small>' + v.anni[v.gap] + ': tratteggio</small>' : '') + d.nodo.outerHTML + '</div>';
      }).join('') + '</div>';
    }
  };


  /* =================================================================
     LEZIONE 15 — «GLI ESERCIZI SONO TUTTI QUA»
     La lezione in cui il docente svolge la prova scritta: cinque
     esercizi, un punto ciascuno. Coordinate (1), densità (1), grafico
     (1) e due o tre calcoli di tassi, indici e incrementi.
     Qui i tipi nuovi:
       reticolo_posiziona   date le coordinate, si mette il punto
       indici_demografici   incremento medio annuo, tassi (% o ‰),
                            saldi, maschilità, dipendenza
       densita_simboli      un quadrato, la legenda dei simboli e il
                            modello di distribuzione
       grafico_combinato    canne maschi/femmine e linea del totale,
                            con gli anni mancanti
     ================================================================= */

  // nei tutorial i passi precedenti si riapplicano: ogni evidenziazione si disegna una volta sola
  function unaVolta(api, nomi) {
    var fatti = {};
    nomi.forEach(function (k) { var f = api[k]; api[k] = function () { if (fatti[k]) return; fatti[k] = 1; return f.apply(null, arguments); }; });
    return api;
  }
  // numeri scritti all'italiana: 1.531.860  −204.248  0,86  +700
  function numIt(v) {
    if (v == null) return NaN;
    var s = String(v).trim().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/^\+/, '').replace(/[%‰]$/, '');
    if (s === '' || s === '-') return NaN;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
  }
  function dec2(x) {
    var y = Math.round(x * 100) / 100, neg = y < 0, a = Math.abs(y);
    var intero = Math.floor(a + 1e-9), cent = Math.round((a - intero) * 100);
    if (cent === 100) { intero++; cent = 0; }
    return (neg ? '−' : '') + migliaia(intero) + ',' + pad2(cent);
  }
  function conSegno(x, testo) { return (x > 0 ? '+' : '') + testo; }
  function vicinoA(x, y, tol) { return typeof x === 'number' && !isNaN(x) && Math.abs(x - y) <= tol; }

  // la frazione, con il × 100 se serve
  function frazione(sopra, sotto, per, risultato) {
    var lungo = Math.max(String(sopra).length, String(sotto).length);
    var fsz = Math.max(17, 28 - lungo * 1.05), larg = Math.max(130, lungo * fsz * 0.62 + 20);
    var W = larg + (per ? 110 : 20) + Math.max(120, String(risultato).length * 15 + 40);
    var s = sv('svg', { viewBox: '0 0 ' + Math.round(W) + ' 110', role: 'img', style: 'max-width:' + Math.min(440, Math.round(W)) + 'px',
      'aria-label': sopra + ' diviso ' + sotto + (per ? ' ' + per : '') + ' uguale ' + risultato });
    s.appendChild(sv('text', { x: larg / 2, y: 40, 'text-anchor': 'middle', 'font-size': fsz, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, sopra));
    s.appendChild(sv('line', { x1: 8, y1: 52, x2: larg - 8, y2: 52, stroke: INCH, 'stroke-width': 2.5 }));
    s.appendChild(sv('text', { x: larg / 2, y: 86, 'text-anchor': 'middle', 'font-size': fsz, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, sotto));
    var x = larg + 6;
    if (per) { s.appendChild(sv('text', { x: x, y: 62, 'font-size': 23, 'font-weight': 700, fill: INCH, 'font-family': 'Georgia,serif' }, per)); x += 100; }
    s.appendChild(sv('text', { x: x, y: 62, 'font-size': 23, 'font-weight': 700, fill: BLU, 'font-family': 'Georgia,serif' }, '= ' + risultato));
    return s;
  }
  // i mesi in dodicesimi: una barra di 12 caselle
  function barraMesi(m) {
    var s = sv('svg', { viewBox: '0 0 300 74', role: 'img', style: 'max-width:300px', 'aria-label': m + ' mesi su 12: ' + m + ' dodicesimi di anno' });
    for (var k = 0; k < 12; k++) s.appendChild(sv('rect', { x: 6 + k * 24, y: 8, width: 22, height: 26, rx: 3, fill: k < m ? 'rgba(35,80,160,.55)' : '#fff', stroke: INCH, 'stroke-width': 1.2 }));
    s.appendChild(sv('text', { x: 150, y: 62, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: BLU, 'font-family': 'Georgia,serif' },
      m + ' mesi = ' + m + '/12 = ' + fmt(Math.round(m / 12 * 100) / 100) + ' di anno'));
    return s;
  }

  /* -----------------------------------------------------------------
     A. METTI IL PUNTO SUL RETICOLO
     «Questo esercizio nel compito arriva in due modi»: si leggono le
     coordinate di un punto, oppure sono date le coordinate e si mette
     il punto. Stessa griglia, stessa regola: prima i numeri sui margini.
     ----------------------------------------------------------------- */
  function inversa(v, G) {
    return {
      lat: function (y) { return v.ns === 'N' ? v.a0 + v.rows - (y - G.SY) / G.CELL : v.a0 + (y - G.SY) / G.CELL; },
      lon: function (x) { return v.eo === 'E' ? v.b0 + (x - G.SX) / G.CELL : v.b0 + v.cols - (x - G.SX) / G.CELL; }
    };
  }
  function scatta5(abs) { var m = Math.round(abs * 12) / 12; return { g: Math.floor(m + 1e-9), m: Math.round((m - Math.floor(m + 1e-9)) * 60) }; }
  function testoCoord(p, v) { return coord(p.latG, p.latM, v.ns) + '  ·  ' + coord(p.lonG, p.lonM, v.eo); }

  var POSIZIONA = {
    nomiErrori: {
      dir: 'Contare i gradi nel verso sbagliato (nord/sud o est/ovest)', decimali: 'Trattare i primi come decimali (45′ non è 0,45°)',
      grado: 'Sbagliare di un grado', scambio: 'Scambiare latitudine e longitudine', stima: 'Stimare male la frazione del riquadro', posizione: 'Mettere il punto nel posto sbagliato'
    },
    opzioni: function () { return stretto() ? { cols: 6, rows: 5, v: 1 } : { cols: 8, rows: 6, v: 1 }; },
    opzioniStampa: function () { return { cols: 8, rows: 6 }; },
    serie: function (seme, n, opz) {
      var r = rngDa(seme), usate = {}, out = [];
      for (var i = 0; i < n; i++) { var v = varianteReticolo(r, i, opz.cols || 8, opz.rows || 6, usate); v.trappola = null; out.push(v); }
      return out;
    },
    domanda: function (v) {
      var d = disegnaReticolo(v, { senzaLuoghi: true }), G = d.api.G, inv = inversa(v, G), foglio = el('div');
      var messi = v.punti.map(function () { return null; }), sel = 0, bloccato = false;
      var segni = sv('g'); d.nodo.appendChild(segni);
      foglio.appendChild(el('h4', { text: 'Metti i due luoghi sul reticolo. Scegli il luogo, poi tocca il punto giusto.' }));
      var righe = v.punti.map(function (p, k) {
        var stato = el('small', { text: 'da mettere' });
        var b = el('button', { type: 'button', 'aria-pressed': k === 0 ? 'true' : 'false' }, [p.nome + ': ' + testoCoord(p, v), stato]);
        b.addEventListener('click', function () { if (bloccato) return; sel = k; aggiorna(); });
        return { b: b, stato: stato };
      });
      var scelta = el('div', { class: 'esx-scelta', role: 'group', 'aria-label': 'Quale luogo metti' }, righe.map(function (x) { return x.b; }));
      foglio.appendChild(scelta);
      foglio.appendChild(el('p', { class: 'esx-nota', text: 'Il punto si aggancia ogni 5 primi. Puoi rimetterlo quante volte vuoi: vale l’ultimo tocco.' }));
      if (!stretto()) foglio.appendChild(el('p', { class: 'esx-nota', text: 'Da tastiera: scegli il luogo, poi frecce per spostarlo di 5 primi.' }));
      function disegnaSegni() {
        while (segni.firstChild) segni.removeChild(segni.firstChild);
        messi.forEach(function (m, k) {
          if (!m) return;
          var px = G.x(m.lon), py = G.y(m.lat), col = k === sel && !bloccato ? '#C2571A' : '#8A5A2B';
          segni.appendChild(sv('circle', { cx: px, cy: py, r: 9, fill: 'rgba(194,87,26,.18)', stroke: col, 'stroke-width': 2.4 }));
          segni.appendChild(sv('circle', { cx: px, cy: py, r: 3.4, fill: col }));
          var aDestra = px < G.gx1 - G.FS * 7;
          segni.appendChild(sv('text', { x: px + (aDestra ? 13 : -13), y: py - 12, 'text-anchor': aDestra ? 'start' : 'end', 'font-size': G.FS - 1, 'font-weight': 700,
            fill: col, stroke: CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, v.punti[k].nome));
        });
      }
      function aggiorna() {
        righe.forEach(function (x, k) { x.b.setAttribute('aria-pressed', k === sel ? 'true' : 'false'); x.stato.textContent = messi[k] ? 'messo ✓' : 'da mettere'; });
        disegnaSegni();
      }
      function metti(lat, lon) {
        if (bloccato) return;
        var a = Math.max(v.a0, Math.min(v.a0 + v.rows, Math.round(lat * 12) / 12));
        var o = Math.max(v.b0, Math.min(v.b0 + v.cols, Math.round(lon * 12) / 12));
        messi[sel] = { lat: a, lon: o };
        var libero = messi.indexOf(null);
        aggiorna();
        if (libero >= 0 && libero !== sel) setTimeout(function () { sel = libero; aggiorna(); }, 350);
      }
      d.nodo.style.cursor = 'crosshair';
      d.nodo.setAttribute('tabindex', '0');
      d.nodo.addEventListener('click', function (ev) {
        var pt = d.nodo.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        var m = d.nodo.getScreenCTM(); if (!m) return;
        var q = pt.matrixTransform(m.inverse());
        if (q.x < G.gx0 - 8 || q.x > G.gx1 + 8 || q.y < G.gy0 - 8 || q.y > G.gy1 + 8) return;
        metti(inv.lat(q.y), inv.lon(q.x));
      });
      d.nodo.addEventListener('keydown', function (ev) {
        if (bloccato) return;
        var m = messi[sel] || { lat: v.a0 + v.rows / 2, lon: v.b0 + v.cols / 2 }, k = ev.key, su = v.ns === 'N' ? 1 : -1, dx = v.eo === 'E' ? 1 : -1;
        if (k === 'ArrowUp') metti(m.lat + su / 12, m.lon);
        else if (k === 'ArrowDown') metti(m.lat - su / 12, m.lon);
        else if (k === 'ArrowRight') metti(m.lat, m.lon + dx / 12);
        else if (k === 'ArrowLeft') metti(m.lat, m.lon - dx / 12);
        else return;
        ev.preventDefault(); ev.stopPropagation();
      });
      aggiorna();
      return {
        nodo: d.nodo, foglio: foglio,
        leggi: function () {
          var manca = messi.indexOf(null);
          if (manca >= 0) { sel = manca; aggiorna(); return null; }
          return { messi: JSON.parse(JSON.stringify(messi)) };
        },
        segna: function (val) {
          bloccato = true; aggiorna();
          righe.forEach(function (x, k) { x.stato.textContent = val.ok[k] ? 'giusto ✓' : 'da correggere'; x.b.style.borderColor = val.ok[k] ? BLU : ROSSO; });
        },
        soluzione: function (anim) {
          var t = Orologio();
          d.api.valori('lat', anim, t); d.api.valori('lon', anim, t);
          d.api.mostraLuoghi(anim, t);
          v.punti.forEach(function (p) { d.api.cartellino(p, anim, t); });
        }
      };
    },
    valuta: function (v, r) {
      var ok = [], errori = [];
      function err(c, t) { errori.push({ c: c, t: t }); }
      v.punti.forEach(function (p, k) {
        var m = r.messi[k], la = absLat(p), lo = absLon(p);
        var dLa = Math.abs(m.lat - la) * 60, dLo = Math.abs(m.lon - lo) * 60, tol = 7.6;
        ok[k] = dLa <= tol && dLo <= tol;
        if (ok[k]) return;
        var giusto = p.nome + ' va a ' + testoCoord(p, v) + '.';
        var ref = v.labLat[0], refO = v.labLon[0];
        if (dLo <= tol && Math.abs(m.lat - (2 * ref - la)) * 60 <= tol) err('dir', p.nome + ': hai contato i gradi di latitudine nel verso sbagliato. ' + (v.ns === 'N' ? 'A nord i numeri crescono salendo.' : 'A sud i numeri crescono scendendo.') + ' ' + giusto);
        else if (dLa <= tol && Math.abs(m.lon - (2 * refO - lo)) * 60 <= tol) err('dir', p.nome + ': hai contato i gradi di longitudine nel verso sbagliato. ' + (v.eo === 'E' ? 'A est i numeri crescono verso destra.' : 'A ovest i numeri crescono verso sinistra.') + ' ' + giusto);
        else if (Math.abs(m.lat - (p.latG + p.latM / 100)) * 60 <= 3 && Math.abs(m.lon - (p.lonG + p.lonM / 100)) * 60 <= 3 && (p.latM || p.lonM)) err('decimali', p.nome + ': hai trattato i primi come decimali. Un grado sono 60 primi, come un’ora: metà è 30, un quarto 15, tre quarti 45. ' + giusto);
        else if (Math.abs(m.lat - lo) * 60 <= tol && Math.abs(m.lon - la) * 60 <= tol) err('scambio', p.nome + ': hai scambiato latitudine e longitudine. ' + giusto);
        else if ((Math.abs(dLa - 60) <= tol && dLo <= tol) || (Math.abs(dLo - 60) <= tol && dLa <= tol)) err('grado', p.nome + ': sei fuori di un grado. Scrivi prima tutti i numeri sui margini, poi conta. ' + giusto);
        else if (dLa <= 25 && dLo <= 25) err('stima', p.nome + ': il riquadro è giusto, ma la frazione no. Dividi il riquadro come l’orologio: ' + (p.latM ? p.latM + '′ di latitudine è ' + FRAZ[p.latM] : 'latitudine proprio sulla linea') + ', ' + (p.lonM ? p.lonM + '′ di longitudine è ' + FRAZ[p.lonM] : 'longitudine proprio sulla linea') + '.');
        else err('posizione', p.nome + ': il punto è lontano. ' + giusto + ' Prima la latitudine, poi la longitudine.');
      });
      return { preso: ok.every(Boolean), errori: errori, ok: ok, nota: 'Si accetta uno scarto di 5 primi: è la precisione di un disegno a mano.' };
    },
    procedimento: function (v) {
      function scena() { return disegnaReticolo(v, { senzaLuoghi: true }); }
      var passi = [
        { scena: 's', titolo: 'Prima i numeri sui margini', testo: '«Prima cosa da fare: scrivete i numeri attorno, su due lati.» Partendo dalle etichette date, si numera ogni linea. ' + (v.ns === 'N' ? 'A nord i numeri crescono salendo' : 'A sud i numeri crescono scendendo') + ', ' + (v.eo === 'E' ? 'a est verso destra.' : 'a ovest verso sinistra.'),
          regola: 'Si numerano tutte le linee prima di cercare il punto.', fai: function (a, an, t) { a.valori('lat', an, t); a.valori('lon', an, t); } }
      ];
      v.punti.forEach(function (p) {
        passi.push({ scena: 's', titolo: p.nome + ': la latitudine', testo: 'Prima la latitudine: ' + coord(p.latG, p.latM, v.ns) + '. Si trova il parallelo dei ' + p.latG + '°' + (p.latM ? ', poi ' + p.latM + ' primi: ' + FRAZ[p.latM] + ' del riquadro.' : ', e il punto sta proprio sulla linea: 00 primi.'),
          fai: function (a, an, t) { a.fascia(p, 'lat', an, t); if (p.latM) a.dividi(p, 'lat', partiPer(p.latM) || 4, an, t); a.tratto(p, 'lat', an, t); } });
        passi.push({ scena: 's', titolo: p.nome + ': la longitudine', testo: 'Poi la longitudine: ' + coord(p.lonG, p.lonM, v.eo) + '. Il meridiano dei ' + p.lonG + '°' + (p.lonM ? ', poi ' + p.lonM + ' primi: ' + FRAZ[p.lonM] + ' del riquadro.' : ', e il punto sta proprio sulla linea.') + ' All’incrocio c’è il punto.',
          fai: function (a, an, t) { a.fascia(p, 'lon', an, t); a.tratto(p, 'lon', an, t); a.mostraLuoghi(an, t); a.cartellino(p, an, t); } });
      });
      return { scena: scena, passi: passi };
    },
    // Il tutorial: il punto A dell'aula, 54°45′ N e 2°45′ O, e un punto proprio su una linea.
    tutorial: function (e) {
      var A = { nome: 'A', latG: 54, latM: 45, lonG: 2, lonM: 45 }, B = { nome: 'Paperopoli', latG: 53, latM: 0, lonG: 5, lonM: 30 };
      var base = { cols: 6, rows: 4, ns: 'N', eo: 'O', a0: 52, b0: 1, punti: [A, B], citta: false, labLat: [54], labLon: [3], trappola: null };
      function scena() { return disegnaReticolo(base, { senzaLuoghi: true }); }
      var passi = [
        { scena: 's', stampa: 'testo', momentaneo: true, titolo: 'Il primo esercizio della prova', testo: ['È il primo esercizio in tutte le prove.', 'Arriva in due modi: c’è un punto e si scrivono le coordinate, oppure ci sono le coordinate e si mette il punto. Qui il secondo modo.'] },
        { scena: 's', stampa: true, titolo: 'Prima i numeri, su due lati', testo: ['Sono date solo due etichette: 54°00′ N e 3°00′ O. Si numerano tutte le linee, prima di tutto.', 'I paralleli salgono verso l’alto: 53, 54, 55… siamo a nord. I meridiani crescono verso sinistra: 2, 3, 4… siamo a ovest.'],
          regola: 'Se il numero sale andando in su, è nord. Se sale andando a sinistra, è ovest.', fai: function (a, an, t) { a.etichetta('lat', an, t); a.etichetta('lon', an, t); a.valori('lat', an, t); a.valori('lon', an, t); } },
        { scena: 's', stampa: true, titolo: 'A: prima la latitudine', testo: ['A è a 54°45′ N. Si prende la fascia tra 54° e 55°.', 'I primi si contano come i minuti dell’orologio: 60 è l’intero, 30 la metà, 15 un quarto, 45 tre quarti. Quindi 45′ è a tre quarti, verso il 55.'],
          regola: '45′ non è 0,45: è tre quarti di grado.', extra: function (t) { return quadrante(45, t); }, fai: function (a, an, t) { a.fascia(A, 'lat', an, t); a.dividi(A, 'lat', 4, an, t); a.tratto(A, 'lat', an, t); } },
        { scena: 's', stampa: true, titolo: 'Poi la longitudine', testo: ['2°45′ O: tra il meridiano dei 2° e quello dei 3°, a tre quarti verso il 3.', 'Attenzione al verso: a ovest i numeri crescono verso sinistra, quindi «verso il 3» è verso sinistra.'],
          fai: function (a, an, t) { a.fascia(A, 'lon', an, t); a.dividi(A, 'lon', 4, an, t); a.tratto(A, 'lon', an, t); a.mostraLuoghi(false, t); a.cartellino(A, an, t); } },
        { scena: 's', stampa: true, titolo: 'Un punto proprio sulla linea', testo: ['Paperopoli è a 53°00′ N: sta proprio sul parallelo dei 53°. E a 5°30′ O, a metà tra 5 e 6.', 'Quando si scrivono le coordinate, gli 00 vanno sempre messi: «altrimenti è battaglia navale».'],
          regola: 'Sulla linea: 00′, scritto sempre.', fai: function (a, an, t) { a.fascia(B, 'lon', an, t); a.tratto(B, 'lon', an, t); a.cartellino(B, an, t); } },
        { scena: 's', stampa: 'testo', titolo: 'Gli errori del docente', testo: ['Partire senza aver numerato i margini: nel compito corretto in aula lo studente aveva scritto 49° invece di 50°.', '«Girare il foglio» e confondere il nord con l’est. Scrivere 60 o 75 primi: «60 non esiste, è di nuovo 0».', 'Si scrive il tondino per i gradi (°), l’apice per i primi (′), e sempre N o S, E o O (va bene anche W).'],
          dopo: function () { return docente(e); } },
        { scena: 's', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Numera tutte le linee, su due lati. 2. Guarda il verso dei numeri: nord o sud, est o ovest. 3. Prima la latitudine, poi la longitudine. 4. I primi come l’orologio: 15, 30, 45.', 'Ora prova tu: 15 reticoli sempre diversi.'],
          fai: function (a, an, t) { a.mostraLuoghi(false, t); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni reticolo numera tutte le linee, poi segna con un punto e il nome i due luoghi alle coordinate date.</p>',
    stampa: function (v, n) {
      var d = disegnaReticolo(v, { stampa: true, fs: 13, larghezza: '112mm', senzaLuoghi: true });
      return '<h3>' + n + '. Metti i luoghi sul reticolo</h3><div class="riga">' + d.nodo.outerHTML + '<div class="risp">' +
        v.punti.map(function (p) { return '<b>' + esc(p.nome) + '</b>: ' + testoCoord(p, v); }).join('<br>') + '</div></div>';
    },
    soluzioni: function (vs) {
      return '<div style="display:flex;flex-wrap:wrap;gap:8px">' + vs.map(function (v, i) {
        var d = disegnaReticolo(v, { stampa: true, fs: 13, larghezza: '86mm' });
        d.api.valori('lat', false, null); d.api.valori('lon', false, null);
        return '<div style="break-inside:avoid;page-break-inside:avoid"><b>' + (i + 1) + '.</b>' + d.nodo.outerHTML + '</div>';
      }).join('') + '</div>';
    }
  };

  /* -----------------------------------------------------------------
     B. TASSI, INDICI E INCREMENTI
     «Di solito ci sono due o tre esercizi che riguardano tassi, indici
     demografici»: un punto ciascuno. Sempre un dato inutile messo apposta.
     Il soggetto al numeratore, la popolazione INIZIALE al denominatore;
     i tassi × 100 o × 1000 «a vostra discrezione»; gli indici restano
     numeri puri (in percentuale va bene lo stesso); due decimali bastano.
     ----------------------------------------------------------------- */
  var MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var FINE_MESE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function etichettaI(v, k) {
    return {
      pop0: 'Abitanti al 1° gennaio ' + v.anno0, pop1: 'Abitanti al ' + v.data1, nati: 'Nati nel ' + v.annoD, morti: 'Morti nel ' + v.annoD,
      imm: 'Immigrati nel ' + v.annoD, emi: 'Emigrati nel ' + v.annoD, fem: 'Femmine al 1° gennaio ' + v.anno0,
      lav: 'Popolazione in età lavorativa', sup: 'Superficie', fam: 'Famiglie'
    }[k];
  }
  function valoreI(v, k) { return migliaia(v[k]) + (k === 'sup' ? ' km²' : ''); }
  var CHIEDI_I = {
    medio: { t: 'l’incremento (o decremento) medio annuo, in abitanti all’anno e in percentuale', breve: 'Incremento medio annuo', serve: ['pop0', 'pop1'] },
    nat: { t: 'il tasso di natalità', breve: 'Tasso di natalità', serve: ['nati', 'pop0'] },
    mor: { t: 'il tasso di mortalità', breve: 'Tasso di mortalità', serve: ['morti', 'pop0'] },
    incnat: { t: 'l’incremento (o decremento) naturale', breve: 'Incremento naturale', serve: ['nati', 'morti'] },
    migr: { t: 'il saldo migratorio', breve: 'Saldo migratorio', serve: ['imm', 'emi'] },
    masc: { t: 'l’indice di maschilità', breve: 'Indice di maschilità', serve: ['pop0', 'fem'] },
    dip: { t: 'l’indice di dipendenza', breve: 'Indice di dipendenza', serve: ['pop0', 'lav'] }
  };
  // la trappola classica per ogni domanda, più i dati di contorno
  var TRAPPOLA_I = { medio: ['nati', 'sup', 'fam'], nat: ['morti'], mor: ['nati'], incnat: ['imm', 'pop0'], migr: ['nati', 'morti'], masc: ['lav'], dip: ['fem'] };
  var CONTORNO_I = { medio: ['nati', 'sup', 'fam', 'lav'], nat: ['imm', 'emi', 'sup', 'lav'], mor: ['imm', 'emi', 'fam', 'sup'], incnat: ['emi', 'sup', 'fam'], migr: ['pop0', 'sup', 'fam'], masc: ['nati', 'sup', 'fam'], dip: ['morti', 'sup', 'fam'] };
  var PIANO_I = ['nat', 'masc', 'medio', 'mor', 'dip', 'incnat', 'medio', 'migr', 'masc', 'nat', 'dip', 'medio', 'mor', 'migr', 'dip'];
  var MESI_FINE_I = [6, 3, 9, 6, 4, 8, 11, 2, 10, 6, 3, 9, 5, 7, 1];

  function varianteIndici(r, i, usate) {
    var chiede = PIANO_I[i % PIANO_I.length];
    var liberi = IMMAGINARIE.filter(function (x) { return !usate[x]; });
    var luogo = rpick(r, liberi.length ? liberi : IMMAGINARIE); usate[luogo] = true;
    var grande = chiede === 'medio' && r() < 0.5;
    var pop0 = grande ? rint(r, 8, 240) * 100000 + rint(r, 0, 99999) : rint(r, 18, 420) * 1000 + rint(r, 0, 999);
    var v = { chiede: chiede, luogo: luogo, pop0: pop0, anno0: rint(r, 1995, 2016) };
    v.annoD = v.anno0;
    if (chiede === 'medio') {
      var Y = rint(r, 3, 9), m = MESI_FINE_I[i % MESI_FINE_I.length];
      var anno1 = v.anno0 + Y;
      v.Y = Y; v.m = m; v.data1 = FINE_MESE[m - 1] + ' ' + MESI_IT[m - 1] + ' ' + anno1; v.annoD = v.anno0;
      var ritmo = (r() < 0.45 ? -1 : 1) * rint(r, 18, 140) / 10000;
      v.pop1 = Math.round(pop0 * (1 + ritmo * (Y + m / 12))) + rint(r, -40, 40);
      if (v.pop1 === pop0) v.pop1 += 37;
    }
    v.nati = Math.round(pop0 * rint(r, 62, 118) / 10000);
    v.morti = Math.round(pop0 * rint(r, 68, 132) / 10000);
    if (v.morti === v.nati) v.morti += 3;
    v.imm = Math.round(pop0 * rint(r, 18, 95) / 10000);
    v.emi = Math.round(pop0 * rint(r, 18, 95) / 10000);
    if (v.imm === v.emi) v.emi += 7;
    v.fem = Math.round(pop0 * rint(r, 400, 545) / 1000);
    v.lav = Math.round(pop0 * rint(r, 54, 69) / 100);
    v.sup = rint(r, 24, 860);
    v.fam = Math.round(pop0 / (rint(r, 21, 27) / 10));
    var serve = CHIEDI_I[chiede].serve;
    var extra = [rpick(r, TRAPPOLA_I[chiede])];
    var altri = CONTORNO_I[chiede].filter(function (k) { return extra.indexOf(k) < 0 && serve.indexOf(k) < 0; });
    if (r() < 0.6 && altri.length) extra.push(rpick(r, altri));
    var righe = rmescola(r, serve.concat(extra));
    // l'ordine naturale delle date: prima il 1° gennaio, poi la data finale
    if (righe.indexOf('pop1') >= 0 && righe.indexOf('pop1') < righe.indexOf('pop0')) { righe.splice(righe.indexOf('pop1'), 1); righe.splice(righe.indexOf('pop0') + 1, 0, 'pop1'); }
    v.righe = righe;
    v.superflui = righe.filter(function (k) { return serve.indexOf(k) < 0; });
    return v;
  }
  function risposteI(v) {
    var c = v.chiede, R = {};
    if (c === 'medio') { R.delta = v.pop1 - v.pop0; R.anni = v.Y + v.m / 12; R.media = R.delta / R.anni; R.perc = R.media / v.pop0 * 100; }
    else if (c === 'nat') R.perc = v.nati / v.pop0 * 100;
    else if (c === 'mor') R.perc = v.morti / v.pop0 * 100;
    else if (c === 'incnat') R.n = v.nati - v.morti;
    else if (c === 'migr') R.n = v.imm - v.emi;
    else if (c === 'masc') { R.parte = v.pop0 - v.fem; R.indice = R.parte / v.fem; }
    else if (c === 'dip') { R.parte = v.pop0 - v.lav; R.indice = R.parte / v.lav; }
    return R;
  }
  function testoIndici(v) {
    var C = CHIEDI_I[v.chiede];
    return 'Il territorio di ' + v.luogo + '. Con i dati della scheda calcola ' + C.t + '. Attenzione: non tutti i dati servono.';
  }

  function disegnaIndici(v, opz) {
    opz = opz || {};
    var stampa = !!opz.stampa, FS = opz.fs || (stretto() ? 27 : 17), RIGA = FS * 2.3, W = 600;
    var H = 72 + v.righe.length * RIGA + 24;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', width: opz.larghezza || null,
      'aria-label': 'Scheda di ' + v.luogo + ': ' + v.righe.map(function (k) { return etichettaI(v, k) + ' ' + valoreI(v, k); }).join('; ') + '.' });
    var sotto = sv('g'), base = sv('g'), sopra = sv('g');
    svg.appendChild(sotto); svg.appendChild(base); svg.appendChild(sopra);
    var inch = stampa ? '#000' : INCH;
    base.appendChild(sv('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 10, fill: stampa ? '#fff' : 'rgba(255,255,255,.55)', stroke: stampa ? '#666' : SEPPIA, 'stroke-width': 1.4 }));
    base.appendChild(sv('text', { x: 28, y: 47, 'font-size': FS + 4, 'font-weight': 700 }, v.luogo));
    base.appendChild(sv('text', { x: W - 28, y: 47, 'text-anchor': 'end', 'font-size': FS - 2, 'font-style': 'italic', fill: stampa ? '#444' : SEPPIA }, 'i dati'));
    var pos = {};
    v.righe.forEach(function (k, idx) {
      var y = 70 + idx * RIGA; pos[k] = y;
      base.appendChild(sv('line', { x1: 24, y1: y, x2: W - 24, y2: y, stroke: stampa ? '#bbb' : 'rgba(139,110,75,.45)', 'stroke-width': 1 }));
      base.appendChild(sv('text', { x: 28, y: y + RIGA * 0.66, 'font-size': FS - (FS > 20 ? 3 : 0), fill: inch }, etichettaI(v, k)));
      base.appendChild(sv('text', { x: W - 28, y: y + RIGA * 0.66, 'text-anchor': 'end', 'font-size': FS + 1, 'font-weight': 700, fill: inch }, valoreI(v, k)));
    });
    var api = {
      v: v,
      serve: function (anim, t) {
        CHIEDI_I[v.chiede].serve.forEach(function (k, i) {
          if (pos[k] == null) return;
          var rr = sv('rect', { x: 18, y: pos[k] + 3, width: W - 36, height: RIGA - 6, rx: 6, fill: 'rgba(200,169,110,.32)', stroke: ORO, 'stroke-width': 1.6 });
          sotto.appendChild(rr); appariDopo(rr, anim, t, 100 + i * 350);
        });
      },
      barra: function (anim, t) {
        v.superflui.forEach(function (k, i) {
          var y = pos[k] + RIGA * 0.5, l = sv('line', { x1: 22, y1: y, x2: W - 22, y2: y, stroke: ROSSO, 'stroke-width': 3 });
          sopra.appendChild(l); traccia(l, anim, t, 100 + i * 400, 500);
        });
      },
      soluzione: function (anim, t) { api.serve(false, t); api.barra(false, t); }
    };
    unaVolta(api, ['serve', 'barra']);
    return { nodo: svg, api: api };
  }

  // i passi del calcolo, uguali per tutorial, soluzione e scheda
  function passiIndici(v) {
    var R = risposteI(v), c = v.chiede, P = [];
    if (c === 'medio') {
      P.push({ titolo: 'La variazione', testo: 'Fine meno inizio: ' + migliaia(v.pop1) + ' − ' + migliaia(v.pop0) + ' = ' + conSegno(R.delta, migliaia(R.delta)) + ' abitanti. ' + (R.delta < 0 ? 'È un decremento: ci vuole «un bel meno».' : 'È un incremento.') });
      P.push({ titolo: 'Il tempo, con i mesi', testo: 'Dal 1° gennaio ' + v.anno0 + ' al ' + v.data1 + ' passano ' + v.Y + ' anni e ' + v.m + (v.m === 1 ? ' mese' : ' mesi') + '. I mesi sono dodicesimi: ' + v.m + '/12 = ' + fmt(Math.round(v.m / 12 * 100) / 100) + '. In tutto ' + fmt(Math.round(R.anni * 100) / 100) + ' anni.',
        regola: 'Mai dividere solo per gli anni interi.', extra: function () { return barraMesi(v.m); } });
      P.push({ titolo: 'La media all’anno', testo: migliaia(R.delta) + ' ÷ ' + fmt(Math.round(R.anni * 100) / 100) + ' = ' + conSegno(R.media, migliaia(R.media)) + ' abitanti all’anno.',
        extra: function () { return frazione(migliaia(R.delta), fmt(Math.round(R.anni * 100) / 100), '', conSegno(R.media, migliaia(R.media))); } });
      P.push({ titolo: 'In percentuale', testo: 'Si rapporta alla popolazione iniziale: ' + migliaia(R.media) + ' ÷ ' + migliaia(v.pop0) + ' × 100 = ' + conSegno(R.perc, dec2(R.perc)) + '% all’anno (oppure ' + conSegno(R.perc, dec2(R.perc * 10)) + '‰).',
        regola: 'Al denominatore SEMPRE la popolazione iniziale.', extra: function () { return frazione(migliaia(R.media), migliaia(v.pop0), '× 100', conSegno(R.perc, dec2(R.perc)) + '%'); } });
    } else if (c === 'nat' || c === 'mor') {
      var s = c === 'nat' ? v.nati : v.morti;
      P.push({ titolo: 'Il calcolo', testo: (c === 'nat' ? 'I nati' : 'I morti') + ', il soggetto, vanno sopra; sotto chi era vivo all’inizio dell’anno. ' + migliaia(s) + ' ÷ ' + migliaia(v.pop0) + ' × 100 = ' + dec2(R.perc) + '%. Con il × 1000: ' + dec2(R.perc * 10) + '‰. Vanno bene tutti e due.',
        regola: 'Soggetto ÷ popolazione iniziale, × 100 o × 1000.', extra: function () { return frazione(migliaia(s), migliaia(v.pop0), '× 100', dec2(R.perc) + '%'); } });
    } else if (c === 'incnat') {
      P.push({ titolo: 'Il calcolo', testo: 'Nati meno morti: ' + migliaia(v.nati) + ' − ' + migliaia(v.morti) + ' = ' + conSegno(R.n, migliaia(R.n)) + ' persone.', regola: R.n < 0 ? 'Più morti che nati: decremento, con il meno.' : 'Più nati che morti: incremento, con il più.' });
    } else if (c === 'migr') {
      P.push({ titolo: 'Il calcolo', testo: 'Immigrati meno emigrati: ' + migliaia(v.imm) + ' − ' + migliaia(v.emi) + ' = ' + conSegno(R.n, migliaia(R.n)) + ' persone.', regola: R.n < 0 ? 'Partono più persone di quante ne arrivano: saldo negativo.' : 'Arrivano più persone di quante ne partono: saldo positivo.' });
    } else if (c === 'masc') {
      P.push({ titolo: 'Prima i maschi', testo: 'La scheda dà le femmine, non i maschi: si ricavano. ' + migliaia(v.pop0) + ' − ' + migliaia(v.fem) + ' = ' + migliaia(R.parte) + ' maschi.' });
      P.push({ titolo: 'L’indice', testo: 'I maschi, il soggetto, sopra; le femmine sotto. ' + migliaia(R.parte) + ' ÷ ' + migliaia(v.fem) + ' = ' + dec2(R.indice) + ': ' + dec2(R.indice) + ' maschi per ogni femmina. È un numero puro (in percentuale, ' + dec2(R.indice * 100) + ', va bene lo stesso).',
        regola: 'Un rapporto: basta una divisione.', extra: function () { return frazione(migliaia(R.parte), migliaia(v.fem), '', dec2(R.indice)); } });
    } else if (c === 'dip') {
      P.push({ titolo: 'Chi dipende da chi', testo: 'Chi è fuori dall’età lavorativa, prima e dopo, dipende da chi lavora. ' + migliaia(v.pop0) + ' − ' + migliaia(v.lav) + ' = ' + migliaia(R.parte) + ' persone dipendenti.' });
      P.push({ titolo: 'L’indice', testo: 'I dipendenti sopra, la popolazione in età lavorativa sotto. ' + migliaia(R.parte) + ' ÷ ' + migliaia(v.lav) + ' = ' + dec2(R.indice) + '. Numero puro (in percentuale, ' + dec2(R.indice * 100) + ', va bene lo stesso).',
        regola: 'Dipendenti ÷ lavoratori.', extra: function () { return frazione(migliaia(R.parte), migliaia(v.lav), '', dec2(R.indice)); } });
    }
    return P;
  }

  var INDICI = {
    nomiErrori: {
      superfluo: 'Non riconoscere il dato inutile', scartato: 'Scartare un dato che serve', mesi: 'Non contare i mesi (dividere per gli anni interi)',
      decimi: 'Contare i mesi in decimi invece che in dodicesimi', nonDiviso: 'Non dividere per gli anni', finale: 'Mettere la popolazione finale al denominatore',
      totale: 'Fermarsi alla variazione totale', segno: 'Sbagliare o dimenticare il segno', simbolo: 'Simbolo sbagliato (% o ‰)', perCento: 'Dimenticare il × 100 (o × 1000)',
      scambio: 'Usare i nati per la mortalità (o i morti per la natalità)', invertito: 'Mettere il soggetto al denominatore', perTotale: 'Dividere per tutta la popolazione',
      inutile: 'Usare il dato inutile', sottrazione: 'Sbagliare la sottrazione', calcolo: 'Sbagliare il calcolo', dato: 'Usare i dati di un altro calcolo'
    },
    opzioni: function () { return { v: 1 }; },
    serie: function (seme, n) { var r = rngDa(seme), usate = {}, out = []; for (var i = 0; i < n; i++) out.push(varianteIndici(r, i, usate)); return out; },
    domanda: function (v) {
      var d = disegnaIndici(v, {}), foglio = el('div'), c = {}, ch = v.chiede;
      foglio.appendChild(el('h4', { text: testoIndici(v) }));
      function campo(k, lab, unita, conSimbolo) {
        c[k] = el('input', { class: 'esx-campo largo', inputmode: 'text', 'aria-label': lab, autocomplete: 'off', style: 'width:6.2em' });
        c[k + 'X'] = el('span', { class: 'esx-giusto' });
        var pezzi = [el('span', { class: 'esx-lab', text: lab }), c[k]];
        if (conSimbolo) { c[k + 'S'] = segmentato([{ t: '%', v: '%' }, { t: '‰', v: '‰' }], 'Simbolo'); pezzi.push(c[k + 'S']); }
        else if (unita) pezzi.push(el('span', { class: 'esx-unita', text: unita }));
        pezzi.push(c[k + 'X']);
        foglio.appendChild(el('div', { class: 'esx-riga' }, pezzi));
      }
      if (ch === 'medio') { campo('anni', 'Anni trascorsi', 'anni'); campo('media', 'Media annua', 'abitanti all’anno'); campo('perc', 'In percentuale', null, true); }
      else if (ch === 'nat' || ch === 'mor') campo('perc', 'Tasso', null, true);
      else if (ch === 'incnat' || ch === 'migr') campo('n', CHIEDI_I[ch].breve, 'persone');
      else { campo('parte', ch === 'masc' ? 'Maschi' : 'Dipendenti', 'persone'); campo('indice', 'Indice', ''); }
      if (ch === 'medio' || ch === 'incnat' || ch === 'migr') foglio.appendChild(el('p', { class: 'esx-nota', style: 'margin:-4px 0 10px', text: 'Se è un decremento scrivi il segno meno davanti. Bastano due decimali, con la virgola.' }));
      else foglio.appendChild(el('p', { class: 'esx-nota', style: 'margin:-4px 0 10px', text: 'Bastano due decimali, con la virgola.' }));
      foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:12px 0 4px;line-height:1.4', text: 'Quali dati non servono?' }));
      var chips = el('div', { class: 'esx-chips' }), righe = [];
      v.righe.forEach(function (k) {
        var cb = el('input', { type: 'checkbox' }), lab = el('label', null, [cb, el('span', { text: etichettaI(v, k) })]);
        righe.push({ k: k, cb: cb, lab: lab }); chips.appendChild(lab);
      });
      foglio.appendChild(chips);
      var campi = ['anni', 'media', 'perc', 'n', 'parte', 'indice'].filter(function (k) { return c[k]; });
      return {
        nodo: d.nodo, foglio: foglio,
        leggi: function () {
          var vuoto = campi.filter(function (k) { return !c[k].value.trim(); })[0];
          if (vuoto) { c[vuoto].focus(); return null; }
          var out = { scarti: righe.filter(function (x) { return x.cb.checked; }).map(function (x) { return x.k; }) };
          campi.forEach(function (k) { out[k] = numIt(c[k].value); out[k + '_txt'] = c[k].value; });
          if (c.percS) out.simbolo = c.percS.valore();
          return out;
        },
        segna: function (val) {
          campi.forEach(function (k) { c[k].disabled = true; c[k].classList.add(val.ok[k] ? 'ok' : 'ko'); if (!val.ok[k]) c[k + 'X'].textContent = val.giusti[k]; });
          if (c.percS) { c.percS.blocca(); c.percS.classList.add(val.ok.perc ? 'ok' : 'ko'); }
          righe.forEach(function (x) {
            x.cb.disabled = true;
            if (v.superflui.indexOf(x.k) >= 0) x.lab.classList.add('giusta'); else if (x.cb.checked) x.lab.classList.add('sbagliata');
          });
        },
        soluzione: function (anim) { d.api.soluzione(anim, Orologio()); }
      };
    },
    valuta: function (v, r) {
      var R = risposteI(v), ch = v.chiede, ok = {}, giusti = {}, errori = [];
      function err(cc, t) { errori.push({ c: cc, t: t }); }
      // percentuale: si accetta % o ‰; il numero si riporta in %
      function percentuale(x, simbolo, atteso, nomi) {
        if (!simbolo) { err('simbolo', 'Manca il simbolo: % se hai moltiplicato per 100, ‰ se per 1000.'); return false; }
        var inPerc = simbolo === '‰' ? x / 10 : x, tol = simbolo === '‰' ? 0.011 : 0.0105;
        if (vicinoA(inPerc, atteso, tol)) return true;
        if (simbolo === '%' && vicinoA(x, atteso * 10, 0.11)) { err('simbolo', 'Il numero è per mille: se moltiplichi per 1000 il simbolo è ‰, non %.'); return false; }
        if (simbolo === '‰' && vicinoA(x, atteso, 0.0105)) { err('simbolo', 'Il numero è per cento: se moltiplichi per 100 il simbolo è %, non ‰.'); return false; }
        if (vicinoA(-inPerc, atteso, tol) && atteso !== 0) { err('segno', 'Il numero è giusto, il segno no: ' + (atteso < 0 ? 'è un decremento, ci vuole il meno.' : 'è un incremento, niente meno.')); return false; }
        if (vicinoA(Math.abs(x), Math.abs(atteso / 100), 0.00011)) { err('perCento', 'Manca il × 100: ' + dec2(atteso / 100).replace(',00', '') + ' è il rapporto, troppo piccolo da leggere. Per cento: ' + dec2(atteso) + '%.'); return false; }
        (nomi || []).some(function (n) { if (vicinoA(Math.abs(inPerc), Math.abs(n.val), tol)) { err(n.c, n.t); return true; } return false; }) || err('calcolo', 'Il risultato è ' + dec2(atteso) + '% (o ' + dec2(atteso * 10) + '‰). Ricontrolla la divisione.');
        return false;
      }
      if (ch === 'medio') {
        giusti.anni = fmt(Math.round(R.anni * 100) / 100) + ' anni';
        ok.anni = vicinoA(r.anni, R.anni, 0.011);
        if (!ok.anni) {
          if (vicinoA(r.anni, v.Y, 0.001)) err('mesi', 'Hai contato solo gli anni interi. Dal 1° gennaio ' + v.anno0 + ' al ' + v.data1 + ' ci sono anche ' + v.m + ' mesi: ' + v.Y + ' + ' + v.m + '/12 = ' + giusti.anni + '.');
          else if (vicinoA(r.anni, v.Y + v.m / 10, 0.001)) err('decimi', 'I mesi non sono decimi: sono dodicesimi. ' + v.m + ' mesi = ' + v.m + '/12 = ' + fmt(Math.round(v.m / 12 * 100) / 100) + ', quindi ' + giusti.anni + '.');
          else err('mesi', 'Dal 1° gennaio ' + v.anno0 + ' al ' + v.data1 + ': ' + v.Y + ' anni e ' + v.m + ' mesi, cioè ' + giusti.anni + '.');
        }
        giusti.media = conSegno(R.media, migliaia(R.media));
        ok.media = vicinoA(r.media, R.media, Math.max(1.5, Math.abs(R.media) * 0.004));
        if (!ok.media) {
          if (vicinoA(-r.media, R.media, Math.max(1.5, Math.abs(R.media) * 0.004))) err('segno', 'Media annua: il numero è giusto ma ' + (R.media < 0 ? 'la popolazione cala, ci vuole il meno.' : 'la popolazione cresce, niente meno.'));
          else if (vicinoA(Math.abs(r.media), Math.abs(R.delta / v.Y), Math.abs(R.delta / v.Y) * 0.004)) { if (ok.anni) err('mesi', 'Media annua: hai diviso per ' + v.Y + ', gli anni interi. Si divide per ' + giusti.anni + '.'); }
          else if (vicinoA(Math.abs(r.media), Math.abs(R.delta / (v.Y + v.m / 10)), Math.abs(R.delta) * 0.0004)) { if (ok.anni) err('decimi', 'Media annua: i mesi sono dodicesimi, non decimi.'); }
          else if (vicinoA(Math.abs(r.media), Math.abs(R.delta), 1)) err('nonDiviso', 'Media annua: ' + migliaia(R.delta) + ' è la variazione di tutto il periodo. All’anno: ÷ ' + giusti.anni + ' = ' + giusti.media + '.');
          else err('calcolo', 'Media annua: ' + migliaia(R.delta) + ' ÷ ' + fmt(Math.round(R.anni * 100) / 100) + ' = ' + giusti.media + '.');
        }
        giusti.perc = conSegno(R.perc, dec2(R.perc)) + '%';
        ok.perc = percentuale(r.perc, r.simbolo, R.perc, [
          { val: R.media / v.pop1 * 100, c: 'finale', t: 'In percentuale: hai diviso per la popolazione finale. Al denominatore va SEMPRE quella iniziale, ' + migliaia(v.pop0) + '.' },
          { val: R.delta / v.pop0 * 100, c: 'totale', t: 'In percentuale: questa è la variazione di tutto il periodo. Va divisa anche per gli anni: «dovete fare tutti e due i passaggi».' },
          { val: R.delta / v.Y / v.pop0 * 100, c: 'mesi', t: 'In percentuale: hai diviso per gli anni interi. Con i mesi: ' + giusti.perc + '.' }
        ]);
      } else if (ch === 'nat' || ch === 'mor') {
        var altro = ch === 'nat' ? v.morti : v.nati;
        giusti.perc = dec2(R.perc) + '% (' + dec2(R.perc * 10) + '‰)';
        ok.perc = percentuale(r.perc, r.simbolo, R.perc, [
          { val: altro / v.pop0 * 100, c: 'scambio', t: ch === 'nat' ? 'Hai usato i morti: per la natalità sopra vanno i nati.' : 'Hai usato i nati: per la mortalità sopra vanno i morti. I nati qui sono il dato inutile.' },
          { val: Math.abs(v.nati - v.morti) / v.pop0 * 100, c: 'dato', t: 'Hai usato nati − morti: serve per l’incremento naturale, non per ' + CHIEDI_I[ch].t + '.' }
        ]);
        if (!ok.perc && r.simbolo && vicinoA(r.perc, v.pop0 / (ch === 'nat' ? v.nati : v.morti) * (r.simbolo === '‰' ? 1000 : 100), 1)) { errori.pop(); err('invertito', 'Hai messo la popolazione sopra. Il soggetto va al numeratore: ' + giusti.perc + '.'); }
      } else if (ch === 'incnat' || ch === 'migr') {
        giusti.n = conSegno(R.n, migliaia(R.n));
        ok.n = vicinoA(r.n, R.n, 0.5);
        if (!ok.n) {
          if (vicinoA(r.n, -R.n, 0.5)) err('segno', (ch === 'incnat' ? 'Nati meno morti' : 'Immigrati meno emigrati') + ', in quest’ordine: ' + giusti.n + '. ' + (R.n < 0 ? 'Ci vuole «un bel meno».' : 'È positivo.'));
          else if (ch === 'incnat' && (vicinoA(Math.abs(r.n), Math.abs(v.imm - v.emi), 0.5))) err('dato', 'Hai usato immigrati ed emigrati: quello è il saldo migratorio. Qui nati − morti = ' + giusti.n + '.');
          else if (ch === 'migr' && (vicinoA(Math.abs(r.n), Math.abs(v.nati - v.morti), 0.5))) err('dato', 'Hai usato nati e morti: quello è l’incremento naturale. Qui immigrati − emigrati = ' + giusti.n + '.');
          else err('calcolo', 'Il risultato è ' + giusti.n + '.');
        }
      } else {
        var baseN = ch === 'masc' ? v.fem : v.lav, trappola = ch === 'masc' ? v.lav : v.fem;
        giusti.parte = migliaia(R.parte);
        ok.parte = vicinoA(r.parte, R.parte, 0.5);
        if (!ok.parte) {
          if (vicinoA(r.parte, trappola, 0.5)) err('inutile', (ch === 'masc' ? 'La popolazione in età lavorativa non dice nulla sul sesso: è il dato inutile.' : 'Le femmine non c’entrano con la dipendenza: sono il dato inutile.') + ' ' + migliaia(v.pop0) + ' − ' + migliaia(baseN) + ' = ' + giusti.parte + '.');
          else err('sottrazione', migliaia(v.pop0) + ' − ' + migliaia(baseN) + ' = ' + giusti.parte + '.');
        }
        giusti.indice = dec2(R.indice);
        var x = r.indice;
        ok.indice = vicinoA(x, R.indice, 0.0105) || vicinoA(x, R.indice * 100, 1.05);
        if (!ok.indice) {
          var cmp = function (val) { return vicinoA(x, val, 0.0105) || vicinoA(x, val * 100, 1.05); };
          if (cmp(baseN / R.parte)) err('invertito', 'Indice: hai messo ' + (ch === 'masc' ? 'le femmine' : 'i lavoratori') + ' sopra. Il soggetto (' + (ch === 'masc' ? 'i maschi' : 'chi dipende') + ') va al numeratore: ' + giusti.indice + '.');
          else if (cmp(v.pop0 / baseN)) err('perTotale', 'Indice: hai usato tutta la popolazione sopra. Sopra va solo ' + (ch === 'masc' ? 'il numero dei maschi' : 'chi dipende') + ': ' + giusti.indice + '.');
          else if (cmp(R.parte / v.pop0)) err('perTotale', 'Indice: hai diviso per tutta la popolazione. Sotto va ' + (ch === 'masc' ? 'il numero delle femmine' : 'la popolazione in età lavorativa') + ': ' + giusti.indice + '.');
          else if (cmp((v.pop0 - trappola) / baseN) || cmp(trappola / baseN)) err('inutile', 'Indice: hai usato il dato inutile. ' + migliaia(R.parte) + ' ÷ ' + migliaia(baseN) + ' = ' + giusti.indice + '.');
          else err('calcolo', 'Indice: ' + migliaia(R.parte) + ' ÷ ' + migliaia(baseN) + ' = ' + giusti.indice + '.');
        }
      }
      var scarti = r.scarti || [], serve = CHIEDI_I[ch].serve;
      var scartatoUtile = scarti.filter(function (k) { return serve.indexOf(k) >= 0; });
      var mancati = v.superflui.filter(function (k) { return scarti.indexOf(k) < 0; });
      ok.scarti = !scartatoUtile.length && !mancati.length;
      if (scartatoUtile.length) err('scartato', 'Hai scartato un dato che serve: ' + scartatoUtile.map(function (k) { return etichettaI(v, k).toLowerCase(); }).join(', ') + '.');
      if (mancati.length) err('superfluo', 'Non servivano: ' + mancati.map(function (k) { return etichettaI(v, k).toLowerCase(); }).join(', ') + '. «Lo lasci stare buono lì dov’è.»');
      var tuttiOk = Object.keys(ok).every(function (k) { return ok[k]; });
      return { preso: tuttiOk, errori: errori, ok: ok, giusti: giusti, nota: 'Due decimali bastano; i tassi vanno bene sia in % sia in ‰, gli indici come numero puro o in percentuale.' };
    },
    procedimento: function (v) {
      function scena() { return disegnaIndici(v, {}); }
      var C = CHIEDI_I[v.chiede];
      var passi = [
        { scena: 's', titolo: 'Che cosa chiede', testo: 'Si chiede ' + C.t + '. Servono: ' + C.serve.map(function (k) { return etichettaI(v, k).toLowerCase(); }).join(' e ') + '.', fai: function (a, an, t) { a.serve(an, t); } },
        { scena: 's', titolo: 'Via il dato inutile', testo: 'Non servono: ' + v.superflui.map(function (k) { return etichettaI(v, k).toLowerCase(); }).join(', ') + '. Si barrano subito, così non finiscono nella formula.', regola: '«Lo lasci stare buono lì dov’è.»', fai: function (a, an, t) { a.barra(an, t); } }
      ];
      passiIndici(v).forEach(function (p) { p.scena = 's'; passi.push(p); });
      return { scena: scena, passi: passi };
    },
    // Il tutorial: gli esempi di aula, numero per numero.
    tutorial: function (e) {
      var medio = { chiede: 'medio', luogo: 'Esempio di aula', pop0: 23618420, pop1: 22086560, anno0: 2009, annoD: 2009, Y: 7, m: 6, data1: '30 giugno 2016', righe: ['pop0', 'pop1', 'nati'], nati: 198410 };
      var anno = { luogo: 'Esempio di aula (2012)', pop0: 220350, anno0: 2012, annoD: 2012, fem: 78560, lav: 140550, nati: 2200, morti: 1500, imm: 750, emi: 1200 };
      function caso(ch, righe) { var x = JSON.parse(JSON.stringify(anno)); x.chiede = ch; x.righe = righe; return x; }
      var scene = {
        medio: medio, masc: caso('masc', ['pop0', 'fem', 'lav']), dip: caso('dip', ['pop0', 'fem', 'lav']),
        mor: caso('mor', ['pop0', 'nati', 'morti']), nat: caso('nat', ['pop0', 'nati', 'morti']),
        incnat: caso('incnat', ['pop0', 'nati', 'morti', 'imm', 'emi']), migr: caso('migr', ['pop0', 'nati', 'morti', 'imm', 'emi'])
      };
      Object.keys(scene).forEach(function (k) { var x = scene[k]; x.superflui = x.righe.filter(function (q) { return CHIEDI_I[x.chiede].serve.indexOf(q) < 0; }); });
      function scena(nome, opz) { return disegnaIndici(scene[nome], opz || {}); }
      var pm = passiIndici(medio);
      var passi = [
        { scena: 'medio', stampa: 'testo', momentaneo: true, titolo: 'Tassi, indici e incrementi', testo: ['Il testo dà i dati, e dentro c’è sempre un dato inutile messo apposta.', 'La regola che vale per tutti: il soggetto della domanda va al numeratore, la popolazione di riferimento al denominatore.'],
          regola: 'Soggetto sopra, popolazione sotto.' },
        { scena: 'medio', stampa: true, titolo: 'Incremento medio annuo: i dati', testo: ['L’esempio di aula: 23.618.420 abitanti al 1° gennaio 2009, 22.086.560 al 30 giugno 2016.', 'Servono solo le due popolazioni.'], fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'medio', stampa: 'testo', titolo: pm[0].titolo, testo: pm[0].testo },
        { scena: 'medio', stampa: true, titolo: 'Il tempo: 7,5 anni, non 7', testo: ['Dal 1° gennaio 2009 al 30 giugno 2016 sono 7 anni e 6 mesi: 7,5 anni.', 'I mesi sono dodicesimi: «se fosse novembre, 7 più 11 dodicesimi; se fosse marzo, 3/12, un quarto». Chi divide per 7 «non ha considerato che ci sono dei mesi in mezzo».'],
          regola: 'Mesi = dodicesimi di anno.', extra: function () { return barraMesi(6); }, fai: function (a, an, t) { a.serve(false, t); a.barra(false, t); } },
        { scena: 'medio', stampa: 'testo', titolo: 'La media all’anno', testo: '−1.531.860 ÷ 7,5 = −204.248 abitanti all’anno.', extra: pm[2].extra },
        { scena: 'medio', stampa: 'testo', titolo: 'In percentuale', testo: ['−204.248 ÷ 23.618.420 = −0,0086. Per 100: −0,86% all’anno (oppure −8,6‰).', 'Si può dividere prima per 7,5 o prima per la popolazione iniziale: va bene, ma «dovete fare tutti e due i passaggi».'],
          regola: 'Al denominatore SEMPRE la popolazione iniziale.', extra: pm[3].extra },
        { scena: 'masc', stampa: true, titolo: 'Indice di maschilità', testo: ['Nel 2012: 220.350 abitanti, di cui 78.560 femmine; 140.550 in età lavorativa.', 'I lavoratori qui non servono: è il dato inutile. I maschi si ricavano: 220.350 − 78.560 = 141.790.'],
          fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'masc', stampa: 'testo', titolo: '1,80 maschi per ogni femmina', testo: ['I maschi, il soggetto, sopra: 141.790 ÷ 78.560 = 1,80.', '«È un rapporto e basta solo una divisione.» Resta un numero puro; in percentuale (180) va bene lo stesso.'],
          extra: function () { return frazione('141.790', '78.560', '', '1,80'); }, fai: function (a, an, t) { a.serve(false, t); a.barra(false, t); } },
        { scena: 'dip', stampa: true, titolo: 'Indice di dipendenza', testo: ['«Chi è fuori dall’età lavorativa dipende da qualcun altro»: chi è prima e chi è dopo. 220.350 − 140.550 = 79.800 dipendenti.', '79.800 ÷ 140.550 = 0,57. Qui le femmine sono il dato inutile.'],
          extra: function () { return frazione('79.800', '140.550', '', '0,57'); }, fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'mor', stampa: true, titolo: 'Tasso di mortalità', testo: ['Nel 2012 sono morte 1.500 persone. I 2.200 nati non servono.', 'Sotto va chi era vivo all’inizio dell’anno: 1.500 ÷ 220.350 × 100 = 0,68%. «Per 100 o per 1000, a vostra discrezione»: 6,8‰ va bene lo stesso.'],
          regola: 'Tasso: × 100 (%) o × 1000 (‰).', extra: function () { return frazione('1.500', '220.350', '× 100', '0,68%'); }, fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'nat', stampa: 'testo', titolo: 'Tasso di natalità', testo: '2.200 ÷ 220.350 × 100 = 1,00%, circa l’1%. Qui il dato inutile sono i morti.',
          extra: function () { return frazione('2.200', '220.350', '× 100', '1,00%'); }, fai: function (a, an, t) { a.serve(an, t); a.barra(an, t); } },
        { scena: 'incnat', stampa: true, titolo: 'Incremento naturale e saldo migratorio', testo: ['Nati meno morti: 2.200 − 1.500 = +700.', 'Immigrati meno emigrati: 750 − 1.200 = −450. Quando è negativo ci vuole «un bel meno»; il più davanti agli incrementi mostra che hai le idee chiare.'],
          regola: 'Il segno si scrive sempre.', fai: function (a, an, t) { a.serve(an, t); } },
        { scena: 'nat', stampa: 'testo', titolo: 'Come si scrive', testo: ['Tassi con % o ‰ («la barra con lo zero sopra e due zeri sotto»). Indici come numeri puri. Bastano due decimali, arrotondare non è obbligatorio.', 'E in aula la calcolatrice: «portatene due, porta le batterie».'] },
        { scena: 'nat', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Leggi che cosa chiede. 2. Barra il dato inutile. 3. Soggetto sopra, popolazione iniziale sotto. 4. Per gli incrementi medi: i mesi in dodicesimi, poi ÷ anni e ÷ popolazione iniziale. 5. Segno e simbolo.', 'Ora prova tu: 15 esercizi, ogni volta un calcolo diverso.'],
          dopo: function () { return docente(e); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni scheda fai il calcolo richiesto e barra i dati che non servono. Tassi in % o in ‰, indici come numeri puri; bastano due decimali. Scrivi il segno meno se è un decremento.</p>',
    stampa: function (v, n) {
      var d = disegnaIndici(v, { stampa: true, fs: 17, larghezza: '92mm' }), ch = v.chiede, righe;
      if (ch === 'medio') righe = 'Anni trascorsi: ________<br>Media annua: ________ ab./anno<br>In percentuale: ________';
      else if (ch === 'nat' || ch === 'mor') righe = 'Tasso: ________ (% o ‰)';
      else if (ch === 'incnat' || ch === 'migr') righe = CHIEDI_I[ch].breve + ': ________ persone';
      else righe = (ch === 'masc' ? 'Maschi' : 'Dipendenti') + ': ________<br>Indice: ________';
      return '<h3>' + n + '. ' + esc(testoIndici(v)) + '</h3><div class="riga">' + d.nodo.outerHTML + '<div class="risp">' + righe + '<br>Dati che non servono: ______________<br>Calcolo: ______________</div></div>';
    },
    soluzioni: function (vs) {
      return '<table><tr><th>N.</th><th>Calcolo</th><th>Risultato</th><th>Dati inutili</th></tr>' + vs.map(function (v, i) {
        var R = risposteI(v), ch = v.chiede, calc, ris;
        if (ch === 'medio') { calc = '(' + migliaia(v.pop1) + ' − ' + migliaia(v.pop0) + ') ÷ ' + fmt(Math.round(R.anni * 100) / 100) + ' = ' + conSegno(R.media, migliaia(R.media)) + '; ÷ ' + migliaia(v.pop0) + ' × 100'; ris = conSegno(R.media, migliaia(R.media)) + ' ab./anno; ' + conSegno(R.perc, dec2(R.perc)) + '%'; }
        else if (ch === 'nat' || ch === 'mor') { calc = migliaia(ch === 'nat' ? v.nati : v.morti) + ' ÷ ' + migliaia(v.pop0) + ' × 100'; ris = dec2(R.perc) + '% (' + dec2(R.perc * 10) + '‰)'; }
        else if (ch === 'incnat') { calc = migliaia(v.nati) + ' − ' + migliaia(v.morti); ris = conSegno(R.n, migliaia(R.n)); }
        else if (ch === 'migr') { calc = migliaia(v.imm) + ' − ' + migliaia(v.emi); ris = conSegno(R.n, migliaia(R.n)); }
        else { var b = ch === 'masc' ? v.fem : v.lav; calc = '(' + migliaia(v.pop0) + ' − ' + migliaia(b) + ') ÷ ' + migliaia(b); ris = migliaia(R.parte) + '; indice ' + dec2(R.indice); }
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(CHIEDI_I[ch].breve) + ': ' + calc + '</td><td><b>' + ris + '</b></td><td>' + v.superflui.map(function (k) { return esc(etichettaI(v, k)); }).join(', ') + '</td></tr>';
      }).join('') + '</table>';
    }
  };

  /* -----------------------------------------------------------------
     C. DENSITÀ CON LA LEGENDA E MODELLO DI DISTRIBUZIONE
     Un quadrato con il lato in km e dei simboli; la legenda dice quanto
     vale ogni simbolo. Numeratore: simboli × valore. Denominatore: lato ×
     lato, «sempre l'area in chilometri quadrati». Poi il modello: sparso
     (dicendo dove, se è asimmetrico), accentrato, lineare (sinuoso o
     regolare a T). Mai «casuale».
     ----------------------------------------------------------------- */
  var DIR_S = ['NO', 'N', 'NE', 'O', 'C', 'E', 'SO', 'S', 'SE'];
  var DIR_NOMI = { N: 'a nord (in alto)', S: 'a sud (in basso)', E: 'a est (a destra)', O: 'a ovest (a sinistra)', NE: 'a nord-est (in alto a destra)', NO: 'a nord-ovest (in alto a sinistra)',
    SE: 'a sud-est (in basso a destra)', SO: 'a sud-ovest (in basso a sinistra)', C: 'al centro' };
  var DIR_XY = { NO: [.2, .2], N: [.5, .2], NE: [.8, .2], O: [.2, .5], C: [.5, .5], E: [.8, .5], SO: [.2, .8], S: [.5, .8], SE: [.8, .8] };
  var PIANO_DS = ['sparso:C', 'accentrato:C', 'lineare:sinuoso', 'sparso:SE', 'accentrato:NO', 'lineare:T', 'sparso:N', 'accentrato:E', 'sparso:C', 'lineare:sinuoso', 'accentrato:SO', 'sparso:O', 'lineare:T', 'accentrato:C', 'sparso:NE'];
  var LEGENDE_DS = [1, 2, 2.5, 3, 3.5, 4, 5, 10, 20, 50];
  function nomeModello(mod, sub) {
    if (mod === 'lineare') return sub === 'T' ? 'lineare regolare (a T)' : 'lineare sinuoso';
    if (mod === 'sparso') return sub === 'C' ? 'sparso, su tutto il territorio' : 'sparso ' + DIR_NOMI[sub];
    return 'accentrato ' + DIR_NOMI[sub];
  }
  function adiacente(a, b) {
    var ia = DIR_S.indexOf(a), ib = DIR_S.indexOf(b);
    return a !== 'C' && b !== 'C' && Math.abs(ia % 3 - ib % 3) <= 1 && Math.abs(Math.floor(ia / 3) - Math.floor(ib / 3)) <= 1;
  }
  function puntiModello(r, mod, sub, N) {
    var out = [], g;
    function lontano(p, dmin) { return out.every(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) >= dmin; }); }
    if (mod === 'sparso') {
      var dentro = {
        C: function () { return true; }, N: function (x, y) { return y < 0.46; }, S: function (x, y) { return y > 0.54; }, E: function (x) { return x > 0.54; }, O: function (x) { return x < 0.46; },
        NE: function (x, y) { return x - y > 0.18; }, NO: function (x, y) { return x + y < 0.82; }, SE: function (x, y) { return x + y > 1.18; }, SO: function (x, y) { return y - x > 0.18; }
      }[sub];
      var dmin = sub === 'C' ? 0.19 : 0.15;
      for (g = 0; g < 6000 && out.length < N; g++) {
        var p = [0.08 + r() * 0.84, 0.08 + r() * 0.84];
        if (dentro(p[0], p[1]) && lontano(p, dmin)) out.push(p);
        if (g === 4000) dmin *= 0.85;
      }
    } else if (mod === 'accentrato') {
      var c = DIR_XY[sub], rag = 0.15;
      c = [c[0] + (r() - .5) * .04, c[1] + (r() - .5) * .04];
      for (g = 0; g < 6000 && out.length < N; g++) {
        var a = r() * 2 * Math.PI, d = Math.sqrt(r()) * rag, q = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d];
        if (q[0] > .05 && q[0] < .95 && q[1] > .05 && q[1] < .95 && lontano(q, 0.055)) out.push(q);
        if (g === 3000) rag *= 1.15;
      }
    } else if (sub === 'sinuoso') {
      var fase = r() * Math.PI * 2, amp = 0.18 + r() * 0.07, giri = 1.2 + r() * 0.5, verticale = r() < 0.4;
      for (var k = 0; k < N; k++) {
        var tt = 0.08 + 0.84 * k / (N - 1), yy = 0.5 + amp * Math.sin(fase + tt * giri * 2 * Math.PI);
        out.push(verticale ? [yy, tt] : [tt, yy]);
      }
    } else {
      // a T: una riga e una colonna, punti equidistanti
      var nb = Math.round(N / 2), nv = N - nb, rot = rint(r, 0, 3);
      for (var b = 0; b < nb; b++) out.push([0.12 + 0.76 * b / (nb - 1), 0.2]);
      for (var w = 1; w <= nv; w++) out.push([0.5, 0.2 + 0.68 * w / nv]);
      out = out.map(function (p) { var x = p[0] - .5, y = p[1] - .5; for (var z = 0; z < rot; z++) { var t2 = x; x = -y; y = t2; } return [x + .5, y + .5]; });
    }
    return out;
  }
  function varianteDensitaS(r, i) {
    var parti = PIANO_DS[i % PIANO_DS.length].split(':'), mod = parti[0], sub = parti[1];
    var L = i < 3 ? rpick(r, [1, 2]) : rpick(r, [1, 2, 2, 3, 3, 4]);
    var val = i < 2 ? rpick(r, [1, 2]) : rpick(r, LEGENDE_DS);
    var N = mod === 'lineare' ? rint(r, 10, 14) : rint(r, 8, 15);
    var v = { mod: mod, sub: sub, L: L, val: val, N: N };
    v.punti = puntiModello(r, mod, sub, N); v.N = v.punti.length;
    v.ab = v.N * val; v.A = L * L; v.d = v.ab / v.A;
    return v;
  }

  function disegnaDensitaS(v, opz) {
    opz = opz || {};
    var stampa = !!opz.stampa, FS = opz.fs || (stretto() ? 24 : 16);
    var Q = 360, X0 = FS * 3.4, Y0 = 46, W = X0 + Q + 30, H = Y0 + Q + FS * 5.4;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', width: opz.larghezza || null,
      'aria-label': 'Quadrato di lato ' + v.L + ' km con ' + v.N + ' simboli; legenda: ogni simbolo vale ' + fmt(v.val) + (v.val === 1 ? ' abitante.' : ' abitanti.') });
    var sotto = sv('g'), base = sv('g'), punti = sv('g'), sopra = sv('g');
    [sotto, base, punti, sopra].forEach(function (x) { svg.appendChild(x); });
    var inch = stampa ? '#000' : INCH, cella = Q / v.L;
    base.appendChild(sv('rect', { x: X0, y: Y0, width: Q, height: Q, fill: stampa ? '#fff' : 'rgba(255,255,255,.35)', stroke: inch, 'stroke-width': 2 }));
    for (var k = 1; k < v.L; k++) {
      base.appendChild(sv('line', { x1: X0 + k * cella, y1: Y0, x2: X0 + k * cella, y2: Y0 + Q, stroke: stampa ? '#bbb' : 'rgba(139,110,75,.4)', 'stroke-width': 1, 'stroke-dasharray': '4 5' }));
      base.appendChild(sv('line', { x1: X0, y1: Y0 + k * cella, x2: X0 + Q, y2: Y0 + k * cella, stroke: stampa ? '#bbb' : 'rgba(139,110,75,.4)', 'stroke-width': 1, 'stroke-dasharray': '4 5' }));
    }
    // lato: quota sotto e a sinistra
    var yq = Y0 + Q + FS * 0.9;
    base.appendChild(sv('line', { x1: X0, y1: yq, x2: X0 + Q, y2: yq, stroke: inch, 'stroke-width': 1.2 }));
    base.appendChild(sv('line', { x1: X0, y1: yq - 5, x2: X0, y2: yq + 5, stroke: inch })); base.appendChild(sv('line', { x1: X0 + Q, y1: yq - 5, x2: X0 + Q, y2: yq + 5, stroke: inch }));
    base.appendChild(sv('text', { x: X0 + Q / 2, y: yq + FS * 1.25, 'text-anchor': 'middle', 'font-size': FS, 'font-weight': 700, fill: inch, stroke: stampa ? '#fff' : CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, 'lato ' + v.L + ' km'));
    // legenda
    var yl = Y0 + Q + FS * 4.3;
    base.appendChild(sv('circle', { cx: X0 + 10, cy: yl - FS * 0.33, r: 6, fill: inch }));
    base.appendChild(sv('text', { x: X0 + 24, y: yl, 'font-size': FS, fill: inch }, '= ' + fmt(v.val) + (v.val === 1 ? ' abitante' : ' abitanti')));
    // nord
    base.appendChild(sv('path', { d: 'M ' + (X0 + Q - 6) + ' ' + (Y0 - 34) + ' l -6 15 l 6 -4 l 6 4 z', fill: inch }));
    base.appendChild(sv('text', { x: X0 + Q - 18, y: Y0 - 21, 'text-anchor': 'end', 'font-size': Math.max(12, FS - 3), 'font-style': 'italic', fill: inch }, 'nord'));
    v.punti.forEach(function (p) { punti.appendChild(sv('circle', { cx: X0 + p[0] * Q, cy: Y0 + p[1] * Q, r: 7, fill: inch })); });
    function X(p) { return X0 + p[0] * Q; } function Y(p) { return Y0 + p[1] * Q; }
    var api = {
      v: v,
      conta: function (anim, t) {
        v.punti.forEach(function (p, i) {
          var tx = sv('text', { x: X(p) + 9, y: Y(p) - 8, 'font-size': FS - 3, 'font-weight': 700, fill: BLU, stroke: CARTA, 'stroke-width': 3, 'paint-order': 'stroke' }, String(i + 1));
          sopra.appendChild(tx); appariDopo(tx, anim, t, 80 + i * 140);
        });
      },
      legenda: function (anim, t) {
        var rr = sv('rect', { x: X0 - 6, y: yl - FS * 1.25, width: FS * 9.5, height: FS * 1.7, rx: 6, fill: 'rgba(200,169,110,.35)', stroke: ORO, 'stroke-width': 1.6 });
        sotto.appendChild(rr); appariDopo(rr, anim, t, 100);
      },
      celle: function (anim, t) {
        for (var a = 0; a < v.L; a++) for (var b = 0; b < v.L; b++) {
          var idx = a * v.L + b, rc = sv('rect', { x: X0 + b * cella + 3, y: Y0 + a * cella + 3, width: cella - 6, height: cella - 6, rx: 4, fill: 'rgba(35,80,160,.10)', stroke: BLU, 'stroke-width': 1.2 });
          sotto.appendChild(rc); appariDopo(rc, anim, t, 80 + idx * 160);
          var tx = sv('text', { x: X0 + b * cella + cella / 2, y: Y0 + a * cella + cella / 2 + FS * 0.35, 'text-anchor': 'middle', 'font-size': Math.min(FS + 6, cella / 3), 'font-weight': 700, fill: BLU, opacity: .55 }, String(idx + 1));
          sotto.appendChild(tx); appariDopo(tx, anim, t, 120 + idx * 160);
        }
      },
      perimetro: function (anim, t) {
        var bordo = sv('rect', { x: X0, y: Y0, width: Q, height: Q, fill: 'none', stroke: ROSSO, 'stroke-width': 5, 'stroke-dasharray': (4 * Q) + ' ' + (4 * Q), 'stroke-dashoffset': 4 * Q });
        sopra.appendChild(bordo);
        if (anim && !RIDUCI) { bordo.style.transition = 'stroke-dashoffset 1.6s ease'; t.dopo(60, function () { bordo.setAttribute('stroke-dashoffset', 0); }); } else bordo.setAttribute('stroke-dashoffset', 0);
      },
      modello: function (anim, t) {
        var forma;
        if (v.mod === 'sparso') {
          var zone = { C: [0, 0, 1, 1], N: [0, 0, 1, .5], S: [0, .5, 1, .5], E: [.5, 0, .5, 1], O: [0, 0, .5, 1] };
          if (zone[v.sub]) { var z = zone[v.sub]; forma = sv('rect', { x: X0 + z[0] * Q + 4, y: Y0 + z[1] * Q + 4, width: z[2] * Q - 8, height: z[3] * Q - 8, rx: 10 }); }
          else {
            var tri = { NE: [[0, 0], [1, 0], [1, 1]], NO: [[0, 0], [1, 0], [0, 1]], SE: [[1, 0], [1, 1], [0, 1]], SO: [[0, 0], [1, 1], [0, 1]] }[v.sub];
            forma = sv('path', { d: 'M ' + tri.map(function (p) { return (X0 + p[0] * Q) + ' ' + (Y0 + p[1] * Q); }).join(' L ') + ' Z' });
          }
        } else if (v.mod === 'accentrato') {
          var cx = 0, cy = 0; v.punti.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= v.N; cy /= v.N;
          var rr = 0; v.punti.forEach(function (p) { rr = Math.max(rr, Math.hypot(p[0] - cx, p[1] - cy)); });
          forma = sv('circle', { cx: X0 + cx * Q, cy: Y0 + cy * Q, r: rr * Q + 16 });
        } else {
          var d;
          if (v.sub === 'T') {
            var met = Math.round(v.N / 2), p0 = v.punti[0], p1 = v.punti[met - 1], c1 = v.punti[v.N - 1], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
            d = 'M ' + X(p0) + ' ' + Y(p0) + ' L ' + X(p1) + ' ' + Y(p1) + ' M ' + X([mx, my]) + ' ' + Y([mx, my]) + ' L ' + X(c1) + ' ' + Y(c1);
          } else d = 'M ' + v.punti.map(function (p) { return X(p) + ' ' + Y(p); }).join(' L ');
          forma = sv('path', { d: d, fill: 'none', 'stroke-width': 22, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
          forma.setAttribute('stroke', 'rgba(35,80,160,.18)');
          sotto.appendChild(forma); appariDopo(forma, anim, t, 100);
          return;
        }
        forma.setAttribute('fill', 'rgba(35,80,160,.12)'); forma.setAttribute('stroke', BLU); forma.setAttribute('stroke-width', 2); forma.setAttribute('stroke-dasharray', '7 5');
        sotto.appendChild(forma); appariDopo(forma, anim, t, 100);
      },
      soluzione: function (anim, t) { api.legenda(false, t); api.modello(anim, t); }
    };
    unaVolta(api, ['conta', 'legenda', 'celle', 'perimetro', 'modello']);
    return { nodo: svg, api: api };
  }

  // il selettore della posizione: una rosa 3 × 3
  function rosa(etichetta) {
    var box = el('div', { role: 'group', 'aria-label': etichetta, style: 'display:inline-grid;grid-template-columns:repeat(3,auto);gap:4px' }), valore = null, bloccata = false, centro = 'Al centro', bottoni = {};
    DIR_S.forEach(function (k) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false', class: 'esx-btn sec pic', style: 'min-width:3.4em;padding:8px 6px;border-radius:8px', text: k === 'C' ? centro : k, 'aria-label': DIR_NOMI[k] });
      b.addEventListener('click', function () { if (bloccata) return; valore = k; Object.keys(bottoni).forEach(function (q) { bottoni[q].setAttribute('aria-pressed', q === k ? 'true' : 'false'); bottoni[q].style.background = q === k ? SEPPIA : ''; bottoni[q].style.color = q === k ? '#fff' : ''; }); });
      bottoni[k] = b; box.appendChild(b);
    });
    box.valore = function () { return valore; };
    box.centro = function (t) { bottoni.C.textContent = t; };
    box.blocca = function () { bloccata = true; };
    box.segna = function (ok) { box.style.outline = '2px solid ' + (ok ? BLU : ROSSO); box.style.outlineOffset = '3px'; box.style.borderRadius = '10px'; };
    return box;
  }

  var DENSITA_S = {
    nomiErrori: {
      legenda: 'Dimenticare il valore della legenda', conta: 'Contare male i simboli', perimetro: 'Calcolare il perimetro invece dell’area', lati: 'Sommare i lati', lato: 'Usare il lato al posto dell’area',
      area: 'Sbagliare l’area', invertita: 'Mettere l’area al numeratore', nonDiviso: 'Dimenticare di dividere per l’area', densita: 'Sbagliare la densità',
      casuale: 'Scrivere «casuale»', modello: 'Sbagliare il modello', generico: 'Dire solo «sparso» senza dire dove', dove: 'Sbagliare la posizione', forma: 'Confondere lineare sinuoso e regolare'
    },
    opzioni: function () { return { v: 1 }; },
    serie: function (seme, n) { var r = rngDa(seme), out = []; for (var i = 0; i < n; i++) out.push(varianteDensitaS(r, i)); return out; },
    domanda: function (v) {
      var d = disegnaDensitaS(v, {}), foglio = el('div'), c = {};
      foglio.appendChild(el('h4', { text: 'Calcola la densità di popolamento e descrivi il modello di distribuzione.' }));
      function campo(k, lab, unita) {
        c[k] = el('input', { class: 'esx-campo largo', inputmode: 'decimal', 'aria-label': lab, autocomplete: 'off' });
        c[k + 'X'] = el('span', { class: 'esx-giusto' });
        foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: lab }), c[k], el('span', { class: 'esx-unita', text: unita }), c[k + 'X']]));
      }
      campo('ab', 'Abitanti', 'ab'); campo('area', 'Area', 'km²'); campo('dens', 'Densità', 'ab/km²');
      c.mod = segmentato([{ t: 'Sparso', v: 'sparso' }, { t: 'Accentrato', v: 'accentrato' }, { t: 'Lineare', v: 'lineare' }, { t: 'Casuale', v: 'casuale' }], 'Modello di distribuzione');
      c.modX = el('span', { class: 'esx-giusto' });
      foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'Modello' }), c.mod]));
      c.dove = rosa('Dove si trovano gli abitanti');
      c.forma = segmentato([{ t: 'Sinuoso', v: 'sinuoso' }, { t: 'Regolare, a T', v: 'T' }], 'Che forma ha la linea');
      var rigaDove = el('div', { class: 'esx-riga', style: 'display:none;align-items:flex-start' }, [el('span', { class: 'esx-lab', text: 'Dove?' }), c.dove]);
      var rigaForma = el('div', { class: 'esx-riga', style: 'display:none' }, [el('span', { class: 'esx-lab', text: 'Che linea?' }), c.forma]);
      var spiega = el('p', { class: 'esx-nota', style: 'margin:-2px 0 8px;display:none' });
      foglio.appendChild(rigaDove); foglio.appendChild(rigaForma); foglio.appendChild(spiega); foglio.appendChild(el('div', { class: 'esx-riga' }, [c.modX]));
      c.mod.addEventListener('click', function () {
        var m = c.mod.valore();
        rigaDove.style.display = m === 'sparso' || m === 'accentrato' ? '' : 'none';
        rigaForma.style.display = m === 'lineare' ? '' : 'none';
        c.dove.centro(m === 'sparso' ? 'Ovunque' : 'Al centro');
        spiega.style.display = m === 'sparso' || m === 'accentrato' ? '' : 'none';
        spiega.textContent = m === 'sparso' ? 'Se i simboli coprono tutto il quadrato scegli «Ovunque»; se stanno solo in una parte, scegli quale.' : 'Dove sono raccolti i simboli?';
        riapriPannello();
      });
      return {
        nodo: d.nodo, foglio: foglio,
        leggi: function () {
          if (!c.ab.value.trim() && !c.area.value.trim() && !c.dens.value.trim()) { c.ab.focus(); return null; }
          return { ab: numIt(c.ab.value), area: numIt(c.area.value), dens: numIt(c.dens.value), mod: c.mod.valore(), dove: c.dove.valore(), forma: c.forma.valore() };
        },
        segna: function (val) {
          ['ab', 'area', 'dens'].forEach(function (k) { c[k].disabled = true; c[k].classList.add(val.ok[k] ? 'ok' : 'ko'); if (!val.ok[k]) c[k + 'X'].textContent = val.giusti[k]; });
          c.mod.blocca(); c.mod.classList.add(val.ok.mod ? 'ok' : 'ko'); c.dove.blocca(); c.forma.blocca();
          if (rigaDove.style.display !== 'none') c.dove.segna(val.ok.dove);
          if (rigaForma.style.display !== 'none') c.forma.classList.add(val.ok.dove ? 'ok' : 'ko');
          if (!val.ok.mod || !val.ok.dove) c.modX.textContent = 'Giusto: ' + nomeModello(v.mod, v.sub);
        },
        soluzione: function (anim) { d.api.soluzione(anim, Orologio()); }
      };
    },
    valuta: function (v, r) {
      var ok = {}, giusti = {}, errori = [], L = v.L, A = v.A;
      function err(cc, t) { errori.push({ c: cc, t: t }); }
      giusti.ab = fmt(v.ab);
      ok.ab = vicinoA(r.ab, v.ab, 0.01);
      if (!ok.ab) {
        if (vicinoA(r.ab, v.N, 0.01) && v.val !== 1) err('legenda', 'Ogni simbolo vale ' + fmt(v.val) + ' abitanti (la legenda): ' + v.N + ' × ' + fmt(v.val) + ' = ' + fmt(v.ab) + '.');
        else if (Math.abs(r.ab / v.val - v.N) <= 2 && Math.abs(r.ab / v.val - Math.round(r.ab / v.val)) < 0.01) err('conta', 'I simboli sono ' + v.N + ': ' + v.N + ' × ' + fmt(v.val) + ' = ' + fmt(v.ab) + ' abitanti. Contali numerandoli.');
        else err('legenda', 'Abitanti = simboli × valore della legenda = ' + v.N + ' × ' + fmt(v.val) + ' = ' + fmt(v.ab) + '.');
      }
      giusti.area = A + ' km²';
      ok.area = vicinoA(r.area, A, 0.001);
      if (!ok.area) {
        if (vicinoA(r.area, 4 * L, 0.001)) err('perimetro', '«Ho fatto 2 + 2 + 2 + 2»: ' + (4 * L) + ' è il perimetro. L’area del quadrato è lato × lato: ' + L + ' × ' + L + ' = ' + A + ' km².');
        else if (vicinoA(r.area, 2 * L, 0.001) && L !== 2) err('lati', 'Hai sommato due lati. L’area è lato × lato: ' + A + ' km².');
        else if (vicinoA(r.area, L, 0.001) && L > 1) err('lato', 'Questo è il lato. L’area è lato × lato: ' + A + ' km².');
        else err('area', 'Area = lato × lato = ' + L + ' × ' + L + ' = ' + A + ' km².');
      }
      giusti.dens = dec2(v.d).replace(/,00$/, '') + ' ab/km²';
      ok.dens = vicinoA(r.dens, v.d, 0.0105);
      if (!ok.dens) {
        var x = r.dens;
        if (vicinoA(x, v.N / A, 0.0105) && v.val !== 1) err('legenda', 'Densità: hai diviso i simboli, non gli abitanti. Sopra vanno gli abitanti, ' + fmt(v.ab) + ': ' + fmt(v.ab) + ' ÷ ' + A + ' = ' + giusti.dens + '.');
        else if (vicinoA(x, A / v.ab, 0.0105)) err('invertita', 'Densità: l’area va sotto, gli abitanti sopra: ' + giusti.dens + '.');
        else if (vicinoA(x, v.ab / (4 * L), 0.0105) && L !== 1) err('perimetro', 'Densità: hai diviso per il perimetro. Si divide per l’area, ' + A + ' km².');
        else if (vicinoA(x, v.ab / L, 0.0105) && L > 1) err('lato', 'Densità: hai diviso per il lato. Si divide per l’area, ' + A + ' km².');
        else if (vicinoA(x, v.ab, 0.0105) && A > 1) err('nonDiviso', 'Densità: ' + fmt(v.ab) + ' sono gli abitanti, vanno divisi per l’area: ' + giusti.dens + '.');
        else err('densita', 'Densità = abitanti ÷ area = ' + fmt(v.ab) + ' ÷ ' + A + ' = ' + giusti.dens + '.');
      }
      ok.mod = r.mod === v.mod; ok.dove = true;
      var nota = '';
      if (!r.mod) { ok.mod = false; err('modello', 'Manca il modello: ' + nomeModello(v.mod, v.sub) + '.'); }
      else if (r.mod === 'casuale') err('casuale', '«Non scrivete casuale, perché in geografia non esiste il caso.» Qui è ' + nomeModello(v.mod, v.sub) + '.');
      else if (!ok.mod) err('modello', 'Il modello è ' + nomeModello(v.mod, v.sub) + '.');
      else if (v.mod === 'lineare') { ok.dove = r.forma === v.sub; if (!ok.dove) err('forma', 'Lineare sì, ma ' + (v.sub === 'T' ? 'regolare: linee dritte e punti equidistanti, a T.' : 'sinuoso: la linea fa delle curve.')); }
      else {
        if (!r.dove) { ok.dove = false; err(v.mod === 'sparso' && v.sub !== 'C' ? 'generico' : 'dove', 'Manca dove: ' + nomeModello(v.mod, v.sub) + '.'); }
        else if (v.mod === 'sparso' && v.sub !== 'C' && r.dove === 'C') { ok.dove = false; err('generico', 'Non basta «sparso»: i simboli stanno solo nella parte ' + DIR_NOMI[v.sub].replace(/^a /, '') + '. Va detto: ' + nomeModello(v.mod, v.sub) + '.'); }
        else if (v.mod === 'sparso' && r.dove !== v.sub && adiacente(r.dove, v.sub)) nota = 'Sulla posizione: ' + DIR_NOMI[r.dove] + ' va bene, il più preciso è ' + DIR_NOMI[v.sub] + '. ';
        else if (r.dove !== v.sub) { ok.dove = false; err('dove', 'Posizione: ' + nomeModello(v.mod, v.sub) + '.'); }
      }
      return { preso: ok.ab && ok.area && ok.dens && ok.mod && ok.dove, errori: errori, ok: ok, giusti: giusti, nota: nota + 'La densità si scrive sempre con l’unità: ab/km².' };
    },
    procedimento: function (v) {
      function scena() { return disegnaDensitaS(v, {}); }
      return { scena: scena, passi: [
        { scena: 's', titolo: 'Gli abitanti', testo: 'Si contano i simboli: ' + v.N + '. La legenda dice che ognuno vale ' + fmt(v.val) + ': ' + v.N + ' × ' + fmt(v.val) + ' = ' + fmt(v.ab) + ' abitanti.', regola: 'Numeratore = simboli × legenda.', fai: function (a, an, t) { a.conta(an, t); a.legenda(an, t); } },
        { scena: 's', titolo: 'L’area', testo: 'Lato × lato = ' + v.L + ' × ' + v.L + ' = ' + v.A + ' km²' + (v.L > 1 ? ', non ' + v.L + ' + ' + v.L + ' + ' + v.L + ' + ' + v.L + ' (quello è il perimetro).' : '.'), regola: 'Denominatore = lato × lato.', fai: function (a, an, t) { a.celle(an, t); } },
        { scena: 's', titolo: 'La densità', testo: fmt(v.ab) + ' ÷ ' + v.A + ' = ' + dec2(v.d).replace(/,00$/, '') + ' ab/km².', extra: function () { return frazione(fmt(v.ab), String(v.A), '', dec2(v.d).replace(/,00$/, '') + ' ab/km²'); } },
        { scena: 's', titolo: 'Il modello', testo: 'Come stanno i simboli? ' + nomeModello(v.mod, v.sub).charAt(0).toUpperCase() + nomeModello(v.mod, v.sub).slice(1) + '.', regola: 'Mai «casuale»: in geografia il caso non esiste.', fai: function (a, an, t) { a.modello(an, t); } }
      ] };
    },
    // Il tutorial: i tre quadrati dell'aula e i modelli.
    tutorial: function (e) {
      var r = rngDa(20261122);
      function q(L, val, mod, sub, N) { var v = { mod: mod, sub: sub, L: L, val: val, N: N }; v.punti = puntiModello(r, mod, sub, N); v.N = v.punti.length; v.ab = v.N * val; v.A = L * L; v.d = v.ab / v.A; return v; }
      var scene = { q1: q(1, 1, 'sparso', 'C', 9), q2: q(2, 2, 'sparso', 'C', 9), q3: q(3, 3.5, 'sparso', 'C', 9), se: q(2, 5, 'sparso', 'SE', 11), acc: q(2, 10, 'accentrato', 'C', 12), sin: q(3, 2, 'lineare', 'sinuoso', 12), tt: q(2, 4, 'lineare', 'T', 12) };
      function scena(nome, opz) { return disegnaDensitaS(scene[nome], opz || {}); }
      var passi = [
        { scena: 'q1', stampa: 'testo', momentaneo: true, titolo: 'Densità e distribuzione', testo: ['Un quadrato con il lato in chilometri, dei simboli e una legenda che dice quanto vale ogni simbolo.', 'Si chiede la densità e il modello di distribuzione. Compare in tutte le prove.'] },
        { scena: 'q1', stampa: true, titolo: 'Il primo quadrato dell’aula', testo: ['Lato 1 km, 9 pallini, ogni pallino vale 1 abitante.', 'Sopra: 9 × 1 = 9 abitanti. Sotto: 1 × 1 = 1 km². Densità: 9 ÷ 1 = 9 ab/km².'],
          regola: '«Al numeratore sempre il numero di abitanti, al denominatore sempre l’area in km².»', fai: function (a, an, t) { a.conta(an, t); a.legenda(an, t); } },
        { scena: 'q2', stampa: true, titolo: 'Lato 2: l’area è 4, non 8', testo: ['Lato 2 km, 9 pallini, ognuno vale 2: 9 × 2 = 18 abitanti.', 'Area 2 × 2 = 4 km²: quattro quadratini. Chi scrive 8 ha fatto 2 + 2 + 2 + 2, il perimetro. 18 ÷ 4 = 4,5 ab/km².'],
          extra: function () { return frazione('18', '4', '', '4,5 ab/km²'); }, fai: function (a, an, t) { a.legenda(false, t); a.celle(an, t); } },
        { scena: 'q2', stampa: 'testo', momentaneo: true, titolo: 'L’errore di ogni anno', testo: 'Il bordo rosso è il perimetro: 8 km. Non c’entra niente con la densità. «L’area del quadrato bisogna che la sappiate fare.»', fai: function (a, an, t) { a.perimetro(an, t); } },
        { scena: 'q3', stampa: true, titolo: 'Lato 3, legenda 3,5', testo: ['9 pallini da 3,5: 9 × 3,5 = 31,5 abitanti. Area 3 × 3 = 9 km².', '31,5 ÷ 9 = 3,5 ab/km². Il risultato si scrive sempre con l’unità.'],
          extra: function () { return frazione('31,5', '9', '', '3,5 ab/km²'); }, fai: function (a, an, t) { a.legenda(an, t); a.celle(an, t); } },
        { scena: 'q1', stampa: true, titolo: 'Il modello: sparso', testo: ['I pallini coprono tutto il quadrato: distribuzione sparsa.', '«Non scrivete casuale, perché in geografia non esiste il caso.»'], regola: 'Mai «casuale».', fai: function (a, an, t) { a.modello(an, t); } },
        { scena: 'se', stampa: true, titolo: 'Sparso, ma dove?', testo: ['Qui i pallini sono sparsi, ma solo in basso a destra. Non basta dire «sparso»: si dice l’asimmetria.', '«Sparso in basso a destra, a sud-est.»'], fai: function (a, an, t) { a.modello(an, t); } },
        { scena: 'acc', stampa: true, titolo: 'Accentrato', testo: ['Tutti raccolti in un punto: accentrato (o accorpato, aggregato).', 'Anche qui si dice dove: «aggregato al centro», oppure in un angolo.'], fai: function (a, an, t) { a.modello(an, t); } },
        { scena: 'sin', stampa: true, titolo: 'Lineare sinuoso', testo: 'I pallini seguono una linea che fa delle curve, come un fiume o una strada di valle: «una linearità sinuosa».', fai: function (a, an, t) { a.modello(an, t); } },
        { scena: 'tt', stampa: true, titolo: 'Lineare regolare, a T', testo: 'Linee dritte e pallini equidistanti, come le case lungo due strade che si incrociano: «un lineare a T».', fai: function (a, an, t) { a.modello(an, t); } },
        { scena: 'q3', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Abitanti = simboli × legenda. 2. Area = lato × lato. 3. Densità = abitanti ÷ area, in ab/km². 4. Modello: sparso (e dove), accentrato (e dove), lineare (sinuoso o a T). Mai casuale.', 'Ora prova tu: 15 quadrati sempre diversi.'],
          dopo: function () { return docente(e); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni quadrato calcola gli abitanti (simboli × legenda), l’area (lato × lato) e la densità in ab/km². Poi descrivi il modello: sparso (dicendo dove, se sta in una parte), accentrato (dove), lineare (sinuoso o regolare). Mai «casuale».</p>',
    stampa: function (v, n) {
      var d = disegnaDensitaS(v, { stampa: true, fs: 15, larghezza: '72mm' });
      return '<h3>' + n + '.</h3><div class="riga">' + d.nodo.outerHTML + '<div class="risp">Abitanti: ______<br>Area: ______ km²<br>Densità: ______ ab/km²<br>Modello: ______________________<br>______________________________</div></div>';
    },
    soluzioni: function (vs) {
      return '<table><tr><th>N.</th><th>Abitanti</th><th>Area</th><th>Densità</th><th>Modello</th></tr>' + vs.map(function (v, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + v.N + ' × ' + fmt(v.val) + ' = ' + fmt(v.ab) + '</td><td>' + v.L + ' × ' + v.L + ' = ' + v.A + ' km²</td><td><b>' + dec2(v.d).replace(/,00$/, '') + ' ab/km²</b></td><td>' + esc(nomeModello(v.mod, v.sub)) + '</td></tr>';
      }).join('') + '</table>';
    }
  };

  /* -----------------------------------------------------------------
     D. ISTOGRAMMA MASCHI/FEMMINE E LINEA DEL TOTALE
     «Costruisci un istogramma per maschi e femmine e raffigura sullo
     stesso diagramma cartesiano anche il totale.» L'ultimo esercizio
     della prova. La scala si tara sul totale; gli anni senza dato
     restano al loro posto sull'asse («dividerò quella linea non per
     sette ma per nove») e i pallini si uniscono con il tratteggio.
     ----------------------------------------------------------------- */
  var COL_T = '#2E6B3A';
  function varianteCombinato(r, i, usate) {
    var liberi = IMMAGINARIE.filter(function (x) { return !usate[x]; });
    var luogo = rpick(r, liberi.length ? liberi : IMMAGINARIE); usate[luogo] = true;
    var n = rint(r, 7, 9), passo = i % 4 === 3 ? 10 : 5;
    var inizio = passo === 5 ? rint(r, 388, 397) * 5 : rint(r, 193, 197) * 10;
    if (inizio + passo * (n - 1) > 2025) inizio = 2025 - passo * (n - 1) - ((2025 - passo * (n - 1)) % passo);
    var anni = []; for (var k = 0; k < n; k++) anni.push(inizio + k * passo);
    var quanti = i < 2 ? 1 : (r() < 0.55 ? 2 : 1), buchi = [];
    for (var g = 0; g < 200 && buchi.length < quanti; g++) {
      var b = rint(r, 1, n - 2);
      if (buchi.every(function (x) { return Math.abs(x - b) >= 2; })) buchi.push(b);
    }
    buchi.sort(function (a, b2) { return a - b2; });
    var M = [], F = [];
    anni.forEach(function (_a, j) {
      if (buchi.indexOf(j) >= 0) { M.push(null); F.push(null); return; }
      var m = rint(r, 14, 34) * 2, f = rint(r, 14, 34) * 2;
      if (m === f) f += 2;
      M.push(m); F.push(f);
    });
    var v = { luogo: luogo, anni: anni, buchi: buchi, M: M, F: F, u: 2 };
    completaCombinato(v);
    return v;
  }
  function completaCombinato(v) {
    v.T = v.M.map(function (m, j) { return m == null ? null : m + v.F[j]; });
    var maxT = Math.max.apply(null, v.T.filter(function (x) { return x != null; }));
    var maxMF = Math.max.apply(null, v.M.concat(v.F).filter(function (x) { return x != null; }));
    v.maxT = maxT;
    v.scalaOk = Math.ceil((maxT + 1) / 10) * 10;
    v.scalaMF = Math.ceil((maxMF + 1) / 10) * 10;
    // tre scale: quella di maschi e femmine (sbagliata), una appena sotto il totale (sbagliata) e quella giusta
    var sotto = maxT % 10 ? Math.floor(maxT / 10) * 10 : maxT - 10;
    if (sotto <= v.scalaMF) sotto = v.scalaOk + 20;
    v.scale = [v.scalaMF, sotto, v.scalaOk];
    var giro = (maxT + v.anni[0]) % 3;
    v.scale = v.scale.slice(giro).concat(v.scale.slice(0, giro));
    v.datiAnni = v.anni.filter(function (_a, j) { return v.T[j] != null; });
  }
  // colonne: 'tutti' = ogni anno al suo posto; 'dati' = solo gli anni con il dato
  function disegnaCombinato(v, opz) {
    opz = opz || {};
    var stampa = !!opz.stampa, FS = opz.fs || (stretto() ? 24 : 15), max = opz.max || v.scalaOk, slot = opz.slot || 'tutti';
    var anniCol = slot === 'tutti' ? v.anni.slice() : v.datiAnni.slice();
    var W = 640, H = !stampa && stretto() ? 660 : 420, L = FS * 3.6, R = 16, T = 46, B = FS * 3.4;
    var PW = W - L - R, PH = H - T - B, n = anniCol.length, colW = PW / n, u = v.u;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', width: opz.larghezza || null, tabindex: opz.interattivo ? '0' : null,
      'aria-label': opz.interattivo ? 'Diagramma da costruire. Scegli maschi, femmine o totale e tocca la colonna dell’anno all’altezza del valore.' : 'Istogramma di maschi e femmine con la linea del totale' });
    var griglia = sv('g'), sotto = sv('g'), assi = sv('g'), disegno = sv('g'), sopra = sv('g');
    [griglia, sotto, assi, disegno, sopra].forEach(function (x) { svg.appendChild(x); });
    var inch = stampa ? '#000' : INCH, fine = stampa ? '#ddd' : 'rgba(139,110,75,.22)', medio = stampa ? '#999' : 'rgba(139,110,75,.6)';
    function y(val) { return T + PH - val / max * PH; }
    function xc(j) { return L + colW * (j + 0.5); }
    var bw = Math.min(colW * 0.27, 30);
    function xs(j, s) { return s === 0 ? xc(j) - bw * 0.55 : s === 1 ? xc(j) + bw * 0.55 : xc(j); }
    if (!opz.senzaEtichette) {
      for (var q = 0; q <= max; q += u) {
        var mag = q % 10 === 0;
        if (!mag && max > 160) continue;
        griglia.appendChild(sv('line', { x1: L, y1: y(q), x2: L + PW, y2: y(q), stroke: mag ? medio : fine, 'stroke-width': mag ? 1 : .6 }));
        if (mag && (max <= 160 || q % 20 === 0)) assi.appendChild(sv('text', { x: L - 7, y: y(q) + FS * 0.35, 'text-anchor': 'end', 'font-size': FS - 1, fill: inch }, String(q)));
      }
    }
    assi.appendChild(sv('line', { x1: L, y1: T - 14, x2: L, y2: T + PH, stroke: inch, 'stroke-width': 2 }));
    assi.appendChild(sv('line', { x1: L, y1: T + PH, x2: L + PW + 6, y2: T + PH, stroke: inch, 'stroke-width': 2 }));
    assi.appendChild(sv('path', { d: 'M ' + L + ' ' + (T - 20) + ' l -5 10 l 10 0 z', fill: inch }));
    assi.appendChild(sv('path', { d: 'M ' + (L + PW + 12) + ' ' + (T + PH) + ' l -10 -5 l 0 10 z', fill: inch }));
    if (!opz.senzaEtichette) {
      anniCol.forEach(function (a, j) {
        var manca = v.T[v.anni.indexOf(a)] == null;
        assi.appendChild(sv('text', { x: xc(j), y: T + PH + FS + 7, 'text-anchor': 'middle', 'font-size': FS - (n > 8 ? 2 : 0), fill: manca ? (stampa ? '#777' : SEPPIA) : inch, 'font-style': manca ? 'italic' : null }, String(a)));
        assi.appendChild(sv('line', { x1: xc(j), y1: T + PH, x2: xc(j), y2: T + PH + 5, stroke: inch }));
      });
      assi.appendChild(sv('text', { x: L + PW, y: T + PH + FS * 2.5 + 4, 'text-anchor': 'end', 'font-size': FS - 2, 'font-style': 'italic', fill: stampa ? '#444' : SEPPIA }, 'tempo (anni) →'));
      var leg = [['Maschi', COL_M, 'r'], ['Femmine', COL_F, 'r'], ['Totale', COL_T, 'c']], lx = L + 14;
      leg.forEach(function (x) {
        if (x[2] === 'r') assi.appendChild(sv('rect', { x: lx, y: T - 34, width: 13, height: 13, fill: x[1] }));
        else { assi.appendChild(sv('line', { x1: lx - 3, y1: T - 27, x2: lx + 16, y2: T - 27, stroke: x[1], 'stroke-width': 2.4 })); assi.appendChild(sv('circle', { cx: lx + 6, cy: T - 27, r: 5, fill: x[1] })); }
        assi.appendChild(sv('text', { x: lx + 20, y: T - 22, 'font-size': FS - 2, fill: inch }, x[0]));
        lx += (x[0].length + 4) * (FS - 2) * 0.62;
      });
    }
    // disegna un insieme di valori {M:[],F:[],T:[]} indicizzati come v.anni
    function traccia3(gruppo, val, stile, anim, t) {
      var k = 0, prima = null;
      anniCol.forEach(function (a, j) {
        var idx = v.anni.indexOf(a);
        [['M', 0, COL_M], ['F', 1, COL_F]].forEach(function (s) {
          var x = val[s[0]][idx]; if (x == null) return;
          var h = Math.min(x, max), r0 = sv('rect', { x: xs(j, s[1]) - bw / 2, y: y(h), width: bw, height: T + PH - y(h), fill: stile.vuoto ? 'none' : s[2], 'fill-opacity': stile.vuoto ? null : .85,
            stroke: s[2], 'stroke-width': stile.vuoto ? 2.2 : 1, 'stroke-dasharray': stile.vuoto ? '6 4' : null });
          gruppo.appendChild(r0); appariDopo(r0, anim, t, 80 + k * 90); k++;
          if (stile.valori) { var lb = sv('text', { x: xs(j, s[1]), y: y(h) - 5, 'text-anchor': 'middle', 'font-size': FS - 4, fill: s[2], stroke: stampa ? '#fff' : CARTA, 'stroke-width': 3, 'paint-order': 'stroke' }, String(x)); gruppo.appendChild(lb); appariDopo(lb, anim, t, 120 + k * 90); }
        });
      });
      anniCol.forEach(function (a, j) {
        var idx = v.anni.indexOf(a), x = val.T[idx]; if (x == null) return;
        var h = Math.min(x, max), px = xc(j), py = y(h);
        if (prima && !stile.senzaLinea) {
          var buco = j - prima.j > 1 || anniCol.length < v.anni.length && v.anni.indexOf(a) - v.anni.indexOf(anniCol[prima.j]) > 1;
          var tipo = buco ? (stile.gap || 'tratteggiata') : 'continua';
          if (tipo !== 'nessuna') {
            var seg = sv('line', { x1: prima.x, y1: prima.y, x2: px, y2: py, stroke: COL_T, 'stroke-width': 3, 'stroke-dasharray': tipo === 'tratteggiata' ? '9 7' : (stile.vuoto ? '5 4' : null) });
            gruppo.appendChild(seg); traccia(seg, anim, t, 300 + k * 90, 400);
          }
        }
        var c = sv('circle', { cx: px, cy: py, r: 7, fill: stile.vuoto ? '#fff' : COL_T, stroke: COL_T, 'stroke-width': 2.4 });
        gruppo.appendChild(c); appariDopo(c, anim, t, 250 + k * 90); k++;
        if (stile.valori) { var lb2 = sv('text', { x: px, y: py - 12, 'text-anchor': 'middle', 'font-size': FS - 2, 'font-weight': 700, fill: COL_T, stroke: stampa ? '#fff' : CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, String(x)); gruppo.appendChild(lb2); appariDopo(lb2, anim, t, 300 + k * 90); }
        prima = { j: j, x: px, y: py };
      });
    }
    var giusti = { M: v.M, F: v.F, T: v.T }, fatto = {};
    var api = {
      v: v, svg: svg,
      scala: function (anim, t) {
        if (fatto.scala) return; fatto.scala = 1;
        var rr = sv('rect', { x: L, y: y(v.maxT) - 2, width: PW, height: 4, fill: ROSSO, opacity: .7 });
        sotto.appendChild(rr); appariDopo(rr, anim, t, 100);
        var tx = sv('text', { x: L + PW - 4, y: y(v.maxT) - 8, 'text-anchor': 'end', 'font-size': FS - 1, 'font-weight': 700, fill: ROSSO, stroke: CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, 'totale più alto: ' + v.maxT);
        sopra.appendChild(tx); appariDopo(tx, anim, t, 300);
      },
      buchi: function (anim, t) {
        if (fatto.buchi) return; fatto.buchi = 1;
        anniCol.forEach(function (a, j) {
          if (v.T[v.anni.indexOf(a)] != null) return;
          var c = sv('rect', { x: L + colW * j + 3, y: T, width: colW - 6, height: PH, fill: 'rgba(179,38,30,.07)', stroke: ROSSO, 'stroke-width': 1.3, 'stroke-dasharray': '5 4' });
          sotto.appendChild(c); appariDopo(c, anim, t, 100);
          var tx = sv('text', { x: xc(j), y: T + PH / 2, 'text-anchor': 'middle', 'font-size': FS - 3, 'font-style': 'italic', fill: ROSSO, stroke: CARTA, 'stroke-width': 4, 'paint-order': 'stroke' }, 'nessun dato');
          sopra.appendChild(tx); appariDopo(tx, anim, t, 250);
        });
      },
      canne: function (anim, t) { if (fatto.canne) return; fatto.canne = 1; traccia3(disegno, { M: v.M, F: v.F, T: v.T.map(function () { return null; }) }, { valori: true }, anim, t); },
      totale: function (anim, t) { if (fatto.totale) return; fatto.totale = 1; traccia3(disegno, { M: v.M.map(function () { return null; }), F: v.F.map(function () { return null; }), T: v.T }, { valori: true, gap: 'tratteggiata' }, anim, t); },
      soluzione: function (anim, t, vuoto) { traccia3(sopra, giusti, { vuoto: !!vuoto, valori: !vuoto, gap: 'tratteggiata' }, anim, t); },
      utente: function (val, segmenti, sel, scelto) {
        while (disegno.firstChild) disegno.removeChild(disegno.firstChild);
        function dove(i) { var j = anniCol.indexOf(v.anni[i]), x = val.T[i]; return j < 0 || x == null ? null : { x: xc(j), y: y(Math.min(x, max)) }; }
        (segmenti || []).forEach(function (sg) {
          var a = dove(sg.a), b = dove(sg.b); if (!a || !b) return;
          disegno.appendChild(sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: COL_T, 'stroke-width': 3, 'stroke-dasharray': sg.s === 'tratteggiata' ? '9 7' : null }));
        });
        traccia3(disegno, val, { senzaLinea: true }, false, null);
        if (scelto != null) { var p0 = dove(scelto); if (p0) disegno.appendChild(sv('circle', { cx: p0.x, cy: p0.y, r: 14, fill: 'rgba(200,169,110,.25)', stroke: ORO, 'stroke-width': 2.4 })); }
        if (sel) {
          var j = anniCol.indexOf(v.anni[sel.i]); if (j < 0) return;
          var w = sel.s === 'T' ? colW * 0.5 : bw * 1.3, cx = sel.s === 'M' ? xs(j, 0) : sel.s === 'F' ? xs(j, 1) : xc(j);
          disegno.appendChild(sv('rect', { x: cx - w / 2, y: T, width: w, height: PH, fill: 'rgba(200,169,110,.14)', stroke: ORO, 'stroke-width': 1.5, rx: 4 }));
        }
      },
      punto: function (cx, cy) {
        var pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
        var m = svg.getScreenCTM(); if (!m) return null;
        var p = pt.matrixTransform(m.inverse());
        if (p.x < L || p.x > L + PW || p.y < T - 16 || p.y > T + PH + 10) return null;
        var j = Math.max(0, Math.min(n - 1, Math.floor((p.x - L) / colW)));
        var val = Math.round((T + PH - p.y) / PH * max / u) * u;
        return { i: v.anni.indexOf(anniCol[j]), val: Math.max(0, Math.min(max, val)) };
      }
    };
    if (opz.valori) traccia3(sopra, giusti, { valori: !!opz.conValori, gap: 'tratteggiata' }, false, null);
    return { nodo: svg, api: api };
  }
  function tabellaCombinato(v, stampa) {
    var b = stampa ? '#999' : 'var(--dust)';
    var th = '<th style="padding:4px 8px;border-bottom:1px solid ' + b + ';text-align:left">', td = '<td style="padding:4px 8px;border-bottom:1px solid ' + b + ';text-align:right;font-variant-numeric:tabular-nums">';
    var h = '<table style="border-collapse:collapse;font-size:' + (stampa ? '9.5pt' : '.95rem') + ';margin:2px 0 12px"><tr>' + th + 'Anno</th>' + th.replace('left', 'right') + 'Maschi</th>' + th.replace('left', 'right') + 'Femmine</th></tr>';
    v.anni.forEach(function (a, j) { if (v.T[j] == null) return; h += '<tr>' + td.replace('right', 'left') + a + '</td>' + td + v.M[j] + '</td>' + td + v.F[j] + '</td></tr>'; });
    return h + '</table>';
  }

  var COMBINATO = {
    nomiErrori: {
      somma: 'Sbagliare la somma del totale', scala: 'Tarare la scala su maschi e femmine invece che sul totale', anni: 'Togliere gli anni senza dato dall’asse',
      collega: 'Sbagliare il tratto: tratteggiato dove manca l’anno, continuo altrove', linea: 'Dimenticare o sbagliare un tratto della linea del totale', valore: 'Riportare un valore all’altezza sbagliata', mancante: 'Lasciare fuori un dato',
      scambio: 'Scambiare maschi e femmine', riempito: 'Inventare un valore per l’anno senza dato'
    },
    opzioni: function () { return { v: 1 }; },
    serie: function (seme, n) { var r = rngDa(seme), usate = {}, out = []; for (var i = 0; i < n; i++) out.push(varianteCombinato(r, i, usate)); return out; },
    domanda: function (v) {
      var tav = el('div'), foglio = el('div'), c = {}, sel = null, bloccato = false, modo = 'M';
      var val = { M: v.anni.map(function () { return null; }), F: v.anni.map(function () { return null; }), T: v.anni.map(function () { return null; }) };
      var segmenti = [], scelto = null, d = null;
      foglio.appendChild(el('h4', { text: 'Costruisci un istogramma per maschi e femmine di ' + v.luogo + ' e raffigura sullo stesso diagramma anche il totale.' }));
      // 1. la tabella con i totali da scrivere
      var tab = el('table', { style: 'border-collapse:collapse;font-size:.95rem;margin:2px 0 12px' });
      tab.appendChild(el('tr', null, ['Anno', 'Maschi', 'Femmine', 'Totale'].map(function (x, k) { return el('th', { style: 'padding:5px 9px;border-bottom:1px solid var(--dust);text-align:' + (k ? 'right' : 'left'), text: x }); })));
      c.tot = {};
      v.anni.forEach(function (a, j) {
        if (v.T[j] == null) return;
        var inp = el('input', { class: 'esx-campo', inputmode: 'numeric', 'aria-label': 'Totale ' + a, autocomplete: 'off', style: 'width:3.4em;font-size:1rem;padding:4px 2px' });
        c.tot[j] = inp;
        var td = 'padding:4px 9px;border-bottom:1px solid var(--dust);text-align:right;font-variant-numeric:tabular-nums';
        tab.appendChild(el('tr', null, [el('td', { style: td.replace('right', 'left'), text: String(a) }), el('td', { style: td, text: String(v.M[j]) }), el('td', { style: td, text: String(v.F[j]) }), el('td', { style: td }, [inp])]));
      });
      foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:0 0 4px', text: '1. Scrivi i totali' }));
      foglio.appendChild(tab);
      // 2. la scala
      foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:6px 0 6px', text: '2. Fin dove arriva l’asse verticale?' }));
      c.scala = segmentato(v.scale.map(function (s) { return { t: 'Fino a ' + s, v: s }; }), 'Fin dove arriva l’asse verticale');
      foglio.appendChild(el('div', { class: 'esx-riga' }, [c.scala]));
      // 3. gli anni sull'asse
      var nd = v.datiAnni.length, nt = v.anni.length;
      foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:6px 0 6px', text: '3. Quanti anni metti sull’asse orizzontale?' }));
      var ordineSlot = [{ t: 'Solo i ' + nd + ' con i dati', v: 'dati' }, { t: 'Tutti i ' + nt, v: 'tutti' }];
      if (v.anni[0] % 2) ordineSlot.reverse();
      c.slot = segmentato(ordineSlot, 'Quanti anni sull’asse orizzontale');
      foglio.appendChild(el('div', { class: 'esx-riga' }, [c.slot]));
      // 4. costruisci: canne, pallini e linea, tutto a mano
      foglio.appendChild(el('p', { style: 'font-weight:600;color:var(--ink);margin:10px 0 6px', text: '4. Costruisci il diagramma' }));
      c.modo = segmentato([{ t: 'Maschi', v: 'M' }, { t: 'Femmine', v: 'F' }, { t: 'Totale', v: 'T' }, { t: 'Linea', v: 'L' }], 'Che cosa stai disegnando');
      c.modo.imposta('M');
      foglio.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: 'Disegni' }), c.modo]));
      c.tratto = segmentato([{ t: 'Continua', v: 'continua' }, { t: 'Tratteggiata', v: 'tratteggiata' }], 'Che linea tracci');
      c.tratto.imposta('continua');
      var rigaTratto = el('div', { class: 'esx-riga', style: 'display:none' }, [el('span', { class: 'esx-lab', text: 'Tratto' }), c.tratto]);
      foglio.appendChild(rigaTratto);
      c.modo.addEventListener('click', function () { modo = c.modo.valore() || 'M'; sel = null; scelto = null; rigaTratto.style.display = modo === 'L' ? '' : 'none'; aiuto(); disegna(); });
      var stato = el('span', { class: 'esx-nota', style: 'margin:0;min-width:9em' });
      var meno = el('button', { type: 'button', class: 'esx-btn sec pic', text: '−', 'aria-label': 'Abbassa di una linea' });
      var piu = el('button', { type: 'button', class: 'esx-btn sec pic', text: '+', 'aria-label': 'Alza di una linea' });
      var togli = el('button', { type: 'button', class: 'esx-btn sec pic', text: 'Togli' });
      foglio.appendChild(el('div', { class: 'esx-comandi', style: 'margin-top:6px' }, [stato, meno, piu, togli]));
      var guida = el('p', { class: 'esx-nota' });
      foglio.appendChild(guida);
      function aiuto() {
        guida.textContent = modo === 'L'
          ? 'Tocca un pallino del totale, poi quello dell’anno vicino: li unisci con il tratto scelto. Toccando di nuovo due pallini già uniti, togli la linea.'
          : 'Tocca la colonna dell’anno all’altezza del valore. Ogni linea sottile della griglia vale 2; con − e + ritocchi l’ultimo che hai messo.';
      }
      aiuto();
      function nomeSel() {
        if (modo === 'L') return scelto != null ? 'Pallino del ' + v.anni[scelto] + ': ora tocca quello vicino' : segmenti.length + (segmenti.length === 1 ? ' tratto disegnato' : ' tratti disegnati');
        if (!sel) return 'Tocca una colonna'; var x = val[sel.s][sel.i]; return v.anni[sel.i] + ' · ' + { M: 'maschi', F: 'femmine', T: 'totale' }[sel.s] + ': ' + (x == null ? 'vuoto' : x);
      }
      function linea(i) {
        if (val.T[i] == null) { stato.textContent = 'Lì non c’è un pallino del totale: prima mettilo.'; return; }
        if (scelto == null) { scelto = i; disegna(); return; }
        if (scelto === i) { scelto = null; disegna(); return; }
        var a = Math.min(scelto, i), b = Math.max(scelto, i), k = -1;
        segmenti.forEach(function (sg, q) { if (sg.a === a && sg.b === b) k = q; });
        if (k >= 0) segmenti.splice(k, 1); else segmenti.push({ a: a, b: b, s: c.tratto.valore() || 'continua' });
        scelto = null; disegna();
      }
      function disegna() {
        var sc = c.scala.valore(), sl = c.slot.valore();
        if (!sc || !sl) {
          // il piano c'è già, vuoto: gli assi si numerano dopo aver scelto scala e anni
          var vuoto = disegnaCombinato(v, { max: v.scalaOk, slot: 'tutti', senzaEtichette: true });
          var W2 = vuoto.nodo.viewBox.baseVal.width, H2 = vuoto.nodo.viewBox.baseVal.height;
          vuoto.nodo.appendChild(sv('text', { x: W2 / 2, y: H2 / 2 - 10, 'text-anchor': 'middle', 'font-size': stretto() ? 26 : 17, 'font-style': 'italic', fill: SEPPIA }, 'Prima scegli la scala (2) e gli anni (3):'));
          vuoto.nodo.appendChild(sv('text', { x: W2 / 2, y: H2 / 2 + 22, 'text-anchor': 'middle', 'font-size': stretto() ? 26 : 17, 'font-style': 'italic', fill: SEPPIA }, 'poi qui costruisci il diagramma.'));
          tav.innerHTML = ''; tav.appendChild(vuoto.nodo);
          d = null; stato.textContent = ''; riapriPannello(); return;
        }
        if (!d || d.max !== sc || d.slot !== sl) {
          d = disegnaCombinato(v, { interattivo: true, max: sc, slot: sl }); d.max = sc; d.slot = sl;
          tav.innerHTML = ''; tav.appendChild(d.nodo);
          d.nodo.style.cursor = 'crosshair';
          d.nodo.addEventListener('click', function (ev) { if (bloccato) return; var p = d.api.punto(ev.clientX, ev.clientY); if (!p) return; if (modo === 'L') linea(p.i); else metti(modo, p.i, p.val); });
          d.nodo.addEventListener('keydown', tasto);
        }
        d.api.utente(val, segmenti, bloccato || modo === 'L' ? null : sel, bloccato ? null : scelto);
        stato.textContent = nomeSel(); riapriPannello();
      }
      function metti(s, i, x) { if (bloccato) return; sel = { s: s, i: i }; val[s][i] = x; disegna(); }
      function ritocca(dx) { if (!sel || bloccato || !d || modo === 'L') return; var x = val[sel.s][sel.i]; x = (x == null ? 0 : x) + dx * v.u; metti(sel.s, sel.i, Math.max(0, Math.min(d.max, x))); }
      function tasto(ev) {
        if (bloccato) return;
        var k = ev.key;
        if (modo === 'L') return;
        if (!sel) sel = { s: modo, i: 0 };
        if (k === 'ArrowUp') ritocca(1); else if (k === 'ArrowDown') ritocca(-1);
        else if (k === 'ArrowRight' || k === 'ArrowLeft') { var i2 = sel.i + (k === 'ArrowRight' ? 1 : -1); sel = { s: modo, i: (i2 + v.anni.length) % v.anni.length }; disegna(); }
        else return;
        ev.preventDefault(); ev.stopPropagation();
      }
      meno.addEventListener('click', function () { ritocca(-1); });
      piu.addEventListener('click', function () { ritocca(1); });
      togli.addEventListener('click', function () {
        if (bloccato) return;
        if (modo === 'L') { segmenti.pop(); scelto = null; disegna(); return; }
        if (sel) { val[sel.s][sel.i] = null; segmenti = segmenti.filter(function (sg) { return val.T[sg.a] != null && val.T[sg.b] != null; }); disegna(); }
      });
      [c.scala, c.slot].forEach(function (x) { x.addEventListener('click', disegna); });
      disegna();
      return {
        nodo: tav, foglio: foglio,
        leggi: function () {
          var vuoto = Object.keys(c.tot).filter(function (j) { return !c.tot[j].value.trim(); })[0];
          if (vuoto != null) { c.tot[vuoto].focus(); return null; }
          if (!c.scala.valore() || !c.slot.valore()) { stato.textContent = 'Scegli la scala e gli anni (punti 2 e 3).'; return null; }
          var messi = 0; ['M', 'F', 'T'].forEach(function (s) { val[s].forEach(function (x) { if (x != null) messi++; }); });
          if (!messi) { stato.textContent = 'Prima disegna il diagramma.'; return null; }
          var tot = {}; Object.keys(c.tot).forEach(function (j) { tot[j] = numIt(c.tot[j].value); });
          return { tot: tot, scala: c.scala.valore(), slot: c.slot.valore(), segmenti: JSON.parse(JSON.stringify(segmenti)), val: JSON.parse(JSON.stringify(val)) };
        },
        segna: function (r) {
          bloccato = true;
          Object.keys(c.tot).forEach(function (j) { c.tot[j].disabled = true; var ok = r.ok.tot[j]; c.tot[j].classList.add(ok ? 'ok' : 'ko'); if (!ok) c.tot[j].value = c.tot[j].value + ' → ' + v.T[j]; });
          [['scala', 'scala'], ['slot', 'slot']].forEach(function (x) { c[x[0]].blocca(); c[x[0]].classList.add(r.ok[x[1]] ? 'ok' : 'ko'); });
          c.modo.blocca(); c.tratto.blocca(); [meno, piu, togli].forEach(function (b) { b.disabled = true; });
          disegna();
          stato.textContent = r.preso ? 'Diagramma giusto.' : 'In tratteggio il diagramma giusto.';
        },
        soluzione: function (anim) { if (d) d.api.soluzione(anim, Orologio(), true); }
      };
    },
    valuta: function (v, r) {
      var ok = { tot: {} }, errori = [], visti = {}, tuttiTot = true;
      function err(cc, t) { if (!visti[t]) { errori.push({ c: cc, t: t }); visti[t] = 1; } }
      Object.keys(r.tot).forEach(function (j) {
        ok.tot[j] = r.tot[j] === v.T[j];
        if (!ok.tot[j]) { tuttiTot = false; err('somma', 'Totale del ' + v.anni[j] + ': ' + v.M[j] + ' + ' + v.F[j] + ' = ' + v.T[j] + '.'); }
      });
      ok.scala = r.scala >= v.maxT;
      if (!ok.scala) err('scala', 'Con l’asse fino a ' + r.scala + ' «non ci sta il totale»: arriva a ' + v.maxT + '. La scala si tara sul valore più alto, cioè il totale: fino a ' + v.scalaOk + ' per stare tranquilli.');
      ok.slot = r.slot === 'tutti';
      if (!ok.slot) err('anni', 'Mancano i dati del ' + v.buchi.map(function (b) { return v.anni[b]; }).join(' e del ') + ', ma quegli anni restano sull’asse: «non faccio finta che non ci siano». ' + v.anni.length + ' posizioni, non ' + v.datiAnni.length + '.');
      // la linea: ogni pallino unito a quello dell'anno con dato successivo; tratteggiata dove in mezzo manca un anno
      ok.gap = true;
      var D = []; v.anni.forEach(function (_a, j) { if (v.T[j] != null) D.push(j); });
      var segs = r.segmenti || [], attesi = [];
      for (var k = 0; k + 1 < D.length; k++) attesi.push({ a: D[k], b: D[k + 1], s: D[k + 1] - D[k] > 1 ? 'tratteggiata' : 'continua' });
      attesi.forEach(function (x) {
        var u3 = segs.filter(function (sg) { return sg.a === x.a && sg.b === x.b; })[0];
        if (!u3) { ok.gap = false; err('linea', 'Manca la linea tra il pallino del ' + v.anni[x.a] + ' e quello del ' + v.anni[x.b] + (x.s === 'tratteggiata' ? ': tratteggiata, perché in mezzo manca un anno.' : '.')); }
        else if (u3.s !== x.s) { ok.gap = false; err('collega', x.s === 'tratteggiata' ? 'Tra il ' + v.anni[x.a] + ' e il ' + v.anni[x.b] + ' manca un anno: la linea va tratteggiata, «se delle annate vengono saltate bisogna darne evidenza».' : 'Tra il ' + v.anni[x.a] + ' e il ' + v.anni[x.b] + ' non manca nessun anno: la linea è continua.'); }
      });
      segs.forEach(function (sg) {
        if (!attesi.some(function (x) { return x.a === sg.a && x.b === sg.b; })) { ok.gap = false; err('linea', 'La linea tra il ' + v.anni[sg.a] + ' e il ' + v.anni[sg.b] + ' non va: ogni pallino si unisce solo a quello dell’anno successivo con il dato.'); }
      });
      var tuttiVal = true;
      var scambiati = v.anni.every(function (_a, j) { return v.M[j] == null || (r.val.M[j] === v.F[j] && r.val.F[j] === v.M[j]); });
      if (scambiati) { tuttiVal = false; err('scambio', 'Hai scambiato maschi e femmine: segui la legenda.'); }
      ['M', 'F', 'T'].forEach(function (s) {
        var nome = { M: 'maschi', F: 'femmine', T: 'totale' }[s], giusti = { M: v.M, F: v.F, T: v.T }[s];
        v.anni.forEach(function (a, j) {
          var x = giusti[j], u2 = r.val[s][j];
          if (x == null) { if (u2 != null) { tuttiVal = false; err('riempito', 'Nel ' + a + ' il dato non c’è: lo spazio resta vuoto.'); } return; }
          if (u2 == null) { tuttiVal = false; err('mancante', a + ' (' + nome + '): manca, è ' + x + '.'); return; }
          if (u2 !== x && !(scambiati && s !== 'T')) { tuttiVal = false; err('valore', a + ' (' + nome + '): è ' + x + ', l’hai messo a ' + u2 + '.' + (x > r.scala ? ' Con questa scala non ci sta.' : '')); }
        });
      });
      return { preso: tuttiTot && ok.scala && ok.slot && ok.gap && tuttiVal, errori: errori.slice(0, 6), ok: ok,
        nota: 'Conta tutto: i totali, la scala, gli anni al loro posto, ogni canna e ogni pallino all’altezza giusta, e la linea del totale, tratteggiata dove manca l’anno.' };
    },
    procedimento: function (v) {
      function scena() { return disegnaCombinato(v, {}); }
      var mancanti = v.buchi.map(function (b) { return v.anni[b]; });
      return { scena: scena, passi: [
        { scena: 's', titolo: 'Prima i totali', testo: 'Maschi più femmine, anno per anno: ' + v.anni.map(function (a, j) { return v.T[j] == null ? null : a + ': ' + v.T[j]; }).filter(Boolean).join(', ') + '.' },
        { scena: 's', titolo: 'La scala', testo: 'Il valore più alto è il totale, ' + v.maxT + ': l’asse verticale deve superarlo. Fino a ' + v.scalaOk + '.', regola: 'La scala si tara sul totale, non su maschi e femmine.', fai: function (a, an, t) { a.scala(an, t); } },
        { scena: 's', titolo: 'Gli anni, anche quelli che mancano', testo: 'Il ' + mancanti.join(' e il ') + ' non hanno dati, ma restano al loro posto: ' + v.anni.length + ' posizioni, non ' + v.datiAnni.length + '. Lo spazio resta vuoto.', fai: function (a, an, t) { a.buchi(an, t); } },
        { scena: 's', titolo: 'Le canne', testo: 'Per ogni anno due canne affiancate: maschi e femmine, di colore diverso, con la legenda.', fai: function (a, an, t) { a.buchi(false, t); a.canne(an, t); } },
        { scena: 's', titolo: 'Il totale', testo: 'In alto, un pallino per il totale di ogni anno; i pallini si uniscono con la linea. Attorno agli anni mancanti la linea è tratteggiata.', regola: 'Anno senza dato: spazio vuoto e tratteggio.', fai: function (a, an, t) { a.buchi(false, t); a.canne(false, t); a.totale(an, t); } }
      ] };
    },
    // Il tutorial: i dati di aula, dal 1975 al 2015, senza il 1985 e il 2010.
    tutorial: function (e) {
      var aula = { luogo: 'aula', anni: [1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015], buchi: [2, 7], u: 2,
        M: [56, 50, null, 32, 44, 48, 52, null, 60], F: [60, 40, null, 44, 32, 40, 54, null, 58] };
      completaCombinato(aula);
      function scena(nome, opz) { return disegnaCombinato(aula, Object.assign({ slot: nome === 'sette' ? 'dati' : 'tutti' }, opz || {})); }
      var passi = [
        { scena: 'nove', stampa: 'testo', momentaneo: true, titolo: 'L’ultimo esercizio della prova', testo: ['«Costruisci un istogramma per maschi e femmine e raffigura sullo stesso diagramma cartesiano anche il totale della popolazione.» È l’ultimo esercizio della prova.', 'L’esempio di aula: dal 1975 al 2015, ogni cinque anni. Mancano il 1985 e il 2010.'] },
        { scena: 'nove', stampa: true, titolo: 'Prima i totali', testo: ['1975: 56 + 60 = 116. 1980: 90. 1990: 76. 1995: 76. 2000: 88. 2005: 106. 2015: 60 + 58 = 118.', 'Il valore più alto non è un maschio o una femmina: è il totale, 118.'], fai: function (a, an, t) { a.scala(an, t); } },
        { scena: 'nove', stampa: 'testo', titolo: 'La scala: fino a 120', testo: ['Se tari l’asse sui maschi e le femmine (fino a 60), «non ci sta il totale».', '«Deve arrivare a 120, per stare tranquilli.» E il diagramma va fatto grande: non un francobollo.'], regola: 'La scala si tara sul totale.', fai: function (a, an, t) { a.scala(false, t); } },
        { scena: 'sette', stampa: true, momentaneo: true, titolo: 'Sette posizioni? No', testo: ['Mettendo solo gli anni con i dati, l’asse salta dal 1980 al 1990 e dal 2005 al 2015 come se fossero cinque anni: il tempo è falsato.'] },
        { scena: 'nove', stampa: true, titolo: 'Nove posizioni', testo: ['«Io non faccio finta che non ci siano. Dividerò quella linea non per sette, che sono i dati effettivi, ma per nove.»', 'Il 1985 e il 2010 hanno il loro posto, e lo spazio resta vuoto.'], regola: 'Gli anni mancanti restano sull’asse.', fai: function (a, an, t) { a.buchi(an, t); } },
        { scena: 'nove', stampa: true, titolo: 'Le canne di maschi e femmine', testo: ['Per ogni anno due «canne verticali» affiancate, con colori diversi: «una interna bianca, l’altra colorata con la penna» va benissimo.'], fai: function (a, an, t) { a.buchi(false, t); a.canne(an, t); } },
        { scena: 'nove', stampa: true, titolo: 'Il totale: pallini e linea', testo: ['In alto, in corrispondenza dell’anno, un pallino per il totale. I pallini si uniscono con una linea.', 'Dove l’anno manca, «per collegare i punti uso il tratteggio; per l’altro la linea continua».'],
          regola: 'Anno mancante: si tratteggia.', fai: function (a, an, t) { a.buchi(false, t); a.canne(false, t); a.totale(an, t); } },
        { scena: 'nove', stampa: 'testo', titolo: 'Ricapitolando', testo: ['1. Calcola i totali. 2. Asse verticale fino oltre il totale più alto. 3. Asse orizzontale con tutti gli anni, anche quelli senza dato. 4. Canne affiancate per maschi e femmine, con la legenda. 5. Pallini per il totale, uniti dalla linea, tratteggiata dove manca l’anno.', 'Ora prova tu: 15 tabelle sempre diverse.'],
          dopo: function () { return docente(e); }, fai: function (a, an, t) { a.soluzione(false, t); } }
      ];
      return { scena: scena, passi: passi };
    },
    istruzioniStampa: '<p style="margin:0 0 8px;font-size:10pt">Per ogni tabella calcola i totali, poi su un diagramma cartesiano disegna le canne verticali affiancate di maschi e femmine e i pallini del totale uniti da una linea. Tara la scala sul totale; lascia al loro posto gli anni senza dato e unisci i pallini con il tratteggio.</p>',
    stampa: function (v, n) {
      var d = disegnaCombinato(v, { stampa: true, fs: 15, larghezza: '118mm', senzaEtichette: true, slot: 'tutti' });
      return '<h3>' + n + '. Maschi, femmine e totale a ' + esc(v.luogo) + '</h3><div class="riga">' + tabellaCombinato(v, true) + d.nodo.outerHTML + '</div>';
    },
    soluzioni: function (vs) {
      return '<div style="display:flex;flex-wrap:wrap;gap:8px">' + vs.map(function (v, i) {
        var d = disegnaCombinato(v, { stampa: true, fs: 15, larghezza: '88mm', valori: true, conValori: true });
        return '<div style="break-inside:avoid;page-break-inside:avoid"><b>' + (i + 1) + '.</b> <small>scala fino a ' + v.scalaOk + '; senza dato: ' + v.buchi.map(function (b) { return v.anni[b]; }).join(', ') + '</small>' + d.nodo.outerHTML + '</div>';
      }).join('') + '</div>';
    }
  };


  /* =================================================================
     VIDEO TUTORIAL — al posto di "Impara il metodo"
     I disegni sono quelli animati del tutorial (sempre in scala); la
     voce e i sottotitoli vengono da esercizi-video/copioni.json. Le
     battute con "chiedi" fermano il video: lo studente risponde come
     all'esame, poi la voce dice sì o no e spiega. Gli mp3 li mette il
     server nel campo "audio" del copione; finché mancano, il video va
     avanti a tempo con i soli sottotitoli.
     ================================================================= */
  function stileVideo() {
    if (document.getElementById('esx-video-stile')) return;
    var css = [
      '.esx-video{max-width:980px;margin:0 auto}',
      '.esx-v-palco{position:relative;border-radius:16px;overflow:hidden;background:' + CARTA + ';box-shadow:inset 0 0 0 1px rgba(139,110,75,.35),0 18px 40px -26px rgba(53,42,31,.55)}',
      '.esx-v-palco .esx-tavola{border-radius:0;box-shadow:none;padding:12px 12px 96px;min-height:280px}',
      '.esx-v-palco .esx-tavola svg{max-height:min(60vh,540px);width:auto;max-width:100%;margin:0 auto}',
      '.esx-v-giusta{margin:2px 0 0;color:var(--body);font-size:.95rem}.esx-v-giusta b{color:var(--ink)}',
      '.esx-v-extra{position:absolute;top:12px;right:12px;width:min(30%,210px);background:rgba(255,255,255,.92);border-radius:12px;padding:8px;box-shadow:0 6px 18px rgba(0,0,0,.12);',
      'opacity:0;transform:translateY(-6px);transition:opacity .4s,transform .4s;pointer-events:none}',
      '.esx-v-extra.su{opacity:1;transform:none}.esx-v-extra svg{width:100%;height:auto;display:block}',
      '.esx-v-cc{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:min(92%,760px);text-align:center;pointer-events:none}',
      '.esx-v-cc span{display:inline;background:rgba(18,20,26,.86);color:#fff;font:500 clamp(.98rem,2.1vw,1.2rem)/1.55 var(--font-body);padding:4px 10px;',
      'border-radius:6px;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
      '.esx-v-cc.via{display:none}',
      '.esx-v-grande{position:absolute;inset:0;display:grid;place-items:center;background:rgba(243,234,214,.55);cursor:pointer;border:0;width:100%;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}',
      '.esx-v-grande span{display:flex;align-items:center;gap:14px;background:var(--navy);color:#fff;font:600 1.05rem var(--font-body);padding:16px 26px 16px 18px;border-radius:999px;box-shadow:0 14px 30px -10px rgba(26,47,79,.6);transition:transform .2s}',
      '.esx-v-grande:hover span{transform:scale(1.04)}',
      '.esx-v-grande svg{width:34px;height:34px}',
      '.esx-v-barra{display:flex;align-items:center;gap:10px;margin:12px 2px 0;flex-wrap:wrap}',
      '.esx-v-tasto{width:44px;height:44px;border-radius:50%;border:1px solid var(--dust);background:transparent;color:var(--ink);display:grid;place-items:center;cursor:pointer;flex:none}',
      '.esx-v-tasto.prim{background:var(--navy);border-color:var(--navy);color:#fff;width:50px;height:50px}',
      '.night-mode .esx-v-tasto.prim{background:var(--gold);border-color:var(--gold);color:#14161C}',
      '.esx-v-tasto svg{width:20px;height:20px;fill:currentColor}',
      '.esx-v-tasto:focus-visible{outline:2px solid var(--gold);outline-offset:2px}',
      '.esx-v-tasto[disabled]{opacity:.4;cursor:default}',
      '.esx-v-pista{flex:1 1 200px;display:flex;gap:3px;align-items:center;min-width:160px}',
      '.esx-v-pista button{flex:1;height:8px;border:0;padding:0;border-radius:3px;background:var(--dust);cursor:pointer;position:relative}',
      '.esx-v-pista button.fatto{background:var(--gold)}.esx-v-pista button.ora{background:var(--navy)}',
      '.night-mode .esx-v-pista button.ora{background:#E8D5AA}',
      '.esx-v-pista button.dom::after{content:"";position:absolute;left:50%;top:-6px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#B4573E}',
      '.esx-v-pista button i{position:absolute;inset:0;border-radius:3px;background:var(--gold);transform-origin:left;transform:scaleX(0)}',
      '.esx-v-info{font-size:.82rem;color:var(--sub);white-space:nowrap}',
      '.esx-v-pillola{font:600 .8rem var(--font-body);padding:7px 11px;border-radius:999px;border:1px solid var(--dust);background:transparent;color:var(--ink);cursor:pointer}',
      '.esx-v-pillola[aria-pressed=true]{background:var(--ink);color:var(--paper,#fff);border-color:var(--ink)}',
      '.esx-v-dom{margin-top:14px;border-radius:16px;border:1.5px solid #B4573E;background:linear-gradient(180deg,rgba(180,87,62,.07),transparent);padding:18px 18px 16px;',
      'animation:esxSu .35s ease both}',
      '@keyframes esxSu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '.esx-v-dom h4{margin:0 0 4px;font:700 .72rem var(--font-body);letter-spacing:.2em;text-transform:uppercase;color:#B4573E}',
      '.night-mode .esx-v-dom h4{color:#E39A82}',
      '.esx-v-dom p.q{margin:0 0 12px;font:600 1.08rem/1.45 var(--font-display);color:var(--ink)}',
      '.esx-v-esito{font:700 1.5rem/1.2 var(--font-display);margin:12px 0 2px}',
      '.esx-v-esito.si{color:' + BLU + '}.esx-v-esito.no{color:' + ROSSO + '}',
      '.night-mode .esx-v-esito.si{color:#8FB4E8}.night-mode .esx-v-esito.no{color:#EF9A9A}',
      '.esx-v-fine{position:absolute;inset:0;display:grid;place-items:center;background:rgba(243,234,214,.9);text-align:center;padding:20px}',
      '.esx-v-fine h4{font:700 1.6rem var(--font-display);color:' + INCH + ';margin:0 0 6px}',
      '.esx-v-fine p{color:' + SEPPIA + ';margin:0 0 16px}',
      '.esx-v-fine .esx-comandi{justify-content:center}',
      '@media (max-width:640px){.esx-v-palco .esx-tavola{padding:8px 8px 120px}.esx-v-extra{width:38%}.esx-v-info{display:none}}'
    ].join('');
    document.head.appendChild(el('style', { id: 'esx-video-stile', text: css }));
  }
  var ICO = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>',
    indietro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 6.2v11.6a.8.8 0 0 1-1.2.7L9.6 12.7a.8.8 0 0 1 0-1.4l9.2-5.8a.8.8 0 0 1 1.2.7Z"/></svg>',
    avanti: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 6.2v11.6a.8.8 0 0 0 1.2.7l9.2-5.8a.8.8 0 0 0 0-1.4L5.2 5.5A.8.8 0 0 0 4 6.2Z"/></svg>',
    ripeti: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z"/></svg>'
  };
  function frasiDi(testo) {
    return (String(testo || '').match(/[^.!?…]+[.!?…]*\s*/g) || []).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function Video(dove, T, e, versoAllenamento) {
    stileVideo();
    var cop = COPIONI.video[e.tipo], audioMappa = COPIONI.audio || {}, def = T.tutorial(e), passi = def.passi, bat = cop.battute;
    var t = Orologio(), i = 0, suona = false, finito = false, cc = true, vel = 1, ultimoP = null, ultimaNascosta = null;
    var voce = null;          // { audio } oppure { simulata: {dur, pass, ultimo} }
    var dopoVoce = null;      // che cosa fare quando la voce finisce
    var attesaRisposta = false;
    var box = el('div', { class: 'esx-video' });
    var tav = el('div', { class: 'esx-tavola' });
    var extra = el('div', { class: 'esx-v-extra', 'aria-hidden': 'true' });
    var ccBox = el('div', { class: 'esx-v-cc', 'aria-live': 'polite' }), ccTesto = el('span');
    ccBox.appendChild(ccTesto);
    var grande = el('button', { type: 'button', class: 'esx-v-grande', 'aria-label': 'Avvia il video' });
    grande.innerHTML = '<span>' + ICO.play.replace('<svg', '<svg fill="currentColor"') + 'Guarda il video</span>';
    var palco = el('div', { class: 'esx-v-palco' }, [tav, extra, ccBox, grande]);
    box.appendChild(palco);
    // la barra dei comandi
    function tasto(ico, et, prim) { var b = el('button', { type: 'button', class: 'esx-v-tasto' + (prim ? ' prim' : ''), 'aria-label': et, title: et }); b.innerHTML = ico; return b; }
    var bPlay = tasto(ICO.play, 'Riproduci', true), bInd = tasto(ICO.indietro, 'Passo precedente'), bAv = tasto(ICO.avanti, 'Passo successivo'), bRip = tasto(ICO.ripeti, 'Riascolta la frase');
    var pista = el('div', { class: 'esx-v-pista', role: 'group', 'aria-label': 'Avanzamento del video' });
    var tacche = bat.map(function (b, k) {
      var x = el('button', { type: 'button', class: b.chiedi ? 'dom' : '', 'aria-label': (b.chiedi ? 'Domanda, ' : 'Passo ') + (k + 1) });
      var riempi = el('i'); x.appendChild(riempi);
      x.addEventListener('click', function () { salta(k); });
      pista.appendChild(x); return { b: x, i: riempi };
    });
    var info = el('span', { class: 'esx-v-info' });
    var bCC = el('button', { type: 'button', class: 'esx-v-pillola', 'aria-pressed': 'true', text: 'Sottotitoli' });
    var bVel = el('button', { type: 'button', class: 'esx-v-pillola', 'aria-pressed': 'false', text: '1×' });
    box.appendChild(el('div', { class: 'esx-v-barra' }, [bInd, bPlay, bAv, bRip, pista, info, bCC, bVel]));
    var domanda = el('div'); box.appendChild(domanda);
    var conVoce = bat.some(function (b) { return audioMappa[b.id]; });
    if (!conVoce) box.appendChild(el('p', { class: 'esx-nota', style: 'text-align:center;margin-top:10px', text: 'La voce sta arrivando: per ora il video scorre con i sottotitoli.' }));
    dove.appendChild(box);

    /* ---------- il disegno ---------- */
    function scena(p, nascondi, anim) {
      if (p == null) return;
      var chiaveScena = p + (nascondi ? '-n' : '');
      if (chiaveScena === ultimoP) return;
      ultimoP = chiaveScena;
      t.ferma();
      var pp = passi[p], sc = def.scena(pp.scena);
      var inizio = p; while (inizio > 0 && passi[inizio - 1].scena === pp.scena) inizio--;
      for (var j = inizio; j < p; j++) if (passi[j].fai && !passi[j].momentaneo) passi[j].fai(sc.api, false, t);
      if (pp.fai && !nascondi) pp.fai(sc.api, anim && !RIDUCI, t);
      tav.innerHTML = ''; tav.appendChild(sc.nodo);
      extra.classList.remove('su'); extra.innerHTML = '';
      if (pp.extra && !nascondi) { var ex = pp.extra(t); if (ex) { extra.appendChild(ex); setTimeout(function () { extra.classList.add('su'); }, 500); } }
      riapriPannello();
    }

    /* ---------- la voce ---------- */
    function fermaVoce() {
      if (voce && voce.audio) { voce.audio.onended = null; voce.audio.ontimeupdate = null; voce.audio.pause(); }
      if (voce && voce.simulata) clearInterval(voce.simulata.giro);
      voce = null;
    }
    function sottotitolo(frasi, frac) {
      var tot = frasi.reduce(function (s, f) { return s + f.length; }, 0) || 1, acc = 0, k = 0;
      for (; k < frasi.length; k++) { acc += frasi[k].length; if (frac * tot <= acc) break; }
      ccTesto.textContent = frasi[Math.min(k, frasi.length - 1)] || '';
    }
    function parla(id, testo, fine) {
      fermaVoce();
      var frasi = frasiDi(testo);
      sottotitolo(frasi, 0);
      dopoVoce = fine;
      var a = audioMappa[id];
      if (a && a.url) {
        var au = new Audio(a.url); au.playbackRate = vel; au.preload = 'auto';
        voce = { audio: au };
        au.ontimeupdate = function () { if (au.duration) sottotitolo(frasi, au.currentTime / au.duration); barraOra(au.currentTime / au.duration); };
        au.onended = function () { sottotitolo(frasi, 1); voce = null; var f = dopoVoce; dopoVoce = null; if (f) f(); };
        if (suona) au.play().catch(function () { pausa(); });
      } else {
        // senza mp3: tempo stimato sulla lunghezza del testo
        var dur = Math.max(2.4, testo.length / 15) * 1000;
        voce = { simulata: { dur: dur, pass: 0, ultimo: Date.now(), giro: null } };
        var s = voce.simulata;
        s.giro = setInterval(function () {
          if (!suona) { s.ultimo = Date.now(); return; }
          var ora = Date.now(); s.pass += (ora - s.ultimo) * vel; s.ultimo = ora;
          var f = Math.min(1, s.pass / s.dur);
          sottotitolo(frasi, f); barraOra(f);
          if (f >= 1) { clearInterval(s.giro); voce = null; var g = dopoVoce; dopoVoce = null; if (g) g(); }
        }, 80);
      }
    }
    function barraOra(f) { var x = tacche[i]; if (x) x.i.style.transform = 'scaleX(' + Math.max(0, Math.min(1, f || 0)) + ')'; }

    /* ---------- lo scorrere delle battute ---------- */
    function aggiornaBarra() {
      tacche.forEach(function (x, k) { x.b.className = (bat[k].chiedi ? 'dom ' : '') + (k < i ? 'fatto' : k === i ? 'ora' : ''); x.i.style.transform = 'scaleX(' + (k < i ? 1 : 0) + ')'; });
      info.textContent = (i + 1) + ' / ' + bat.length;
      bInd.disabled = i === 0; bAv.disabled = i >= bat.length - 1;
    }
    function mostra(k) {
      i = Math.max(0, Math.min(bat.length - 1, k));
      finito = false;
      var vecchia = palco.querySelector('.esx-v-fine'); if (vecchia) vecchia.remove();
      domanda.innerHTML = ''; attesaRisposta = false;
      var b = bat[i];
      scena(b.p, !!b.nascondi, true);
      aggiornaBarra();
      if (b.chiedi) parla(b.id, b.voce, function () { chiedi(b); });
      else parla(b.id, b.voce, function () { setTimeout(function () { if (suona && !attesaRisposta) prossima(); }, 450); });
    }
    function prossima() { if (i >= bat.length - 1) fine(); else mostra(i + 1); }
    function salta(k) { fermaVoce(); mostra(k); }
    function chiedi(b) {
      attesaRisposta = true;
      var q = b.chiedi, card = el('div', { class: 'esx-v-dom', role: 'group', 'aria-label': 'Tocca a te' });
      card.appendChild(el('h4', { text: 'Tocca a te' }));
      var fr = frasiDi(b.voce), ultima = fr[fr.length - 1] || '';
      card.appendChild(el('p', { class: 'q', text: ultima.length < 70 && fr.length > 1 ? fr.slice(-2).join(' ') : ultima }));
      var leggiRisposta, segna;
      if (q.coord) {
        var C = q.coord;
        var cG = el('input', { class: 'esx-campo', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Gradi', maxlength: '3', style: 'width:2.6em' });
        var cP = el('input', { class: 'esx-campo', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Primi', maxlength: '2', style: 'width:2.1em' });
        var cD = el('input', { class: 'esx-campo', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': C.lab === 'Latitudine' ? 'Lettera: N o S' : 'Lettera: E oppure O (o W)', maxlength: '1', style: 'width:1.6em;text-transform:uppercase' });
        var segno = function (s) { return el('span', { text: s, 'aria-hidden': 'true', style: 'font:700 1.7rem/1 Georgia,serif;color:var(--ink);margin:0 6px 0 2px;align-self:flex-start;padding-top:2px' }); };
        card.appendChild(el('div', { class: 'esx-riga', style: 'align-items:stretch;flex-wrap:nowrap' }, [el('span', { class: 'esx-lab', text: C.lab, style: 'align-self:center' }), cG, segno('\u00b0'), cP, segno('\u2032'), cD]));
        card.appendChild(el('p', { class: 'esx-nota', style: 'margin:-2px 0 8px', text: 'Gradi, primi (anche 00) e la lettera: N o S, E oppure O (va bene anche W).' }));
        [cG, cP, cD].forEach(function (inp, k3, tutti) {
          inp.addEventListener('input', function () { if (k3 < 2 && inp.value.length >= Number(inp.getAttribute('maxlength')) && tutti[k3 + 1]) tutti[k3 + 1].focus(); });
          inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); rispondi.click(); } });
        });
        leggiRisposta = function () {
          var vuoto = [cG, cP, cD].filter(function (x) { return !x.value.trim(); })[0];
          if (vuoto) { vuoto.focus(); return null; }
          return { g: numIt(cG.value), p: numIt(cP.value), d: cD.value.trim().toUpperCase().replace('W', 'O') };
        };
        segna = function () {
          cG.classList.add(q._ok.g ? 'ok' : 'ko'); cP.classList.add(q._ok.p ? 'ok' : 'ko'); cD.classList.add(q._ok.d ? 'ok' : 'ko');
          [cG, cP, cD].forEach(function (x) { x.disabled = true; });
        };
        q._coord = [cG, cP, cD];
      } else if (q.scelte) {
        var seg = segmentato(q.scelte.map(function (s, k2) { return { t: s, v: k2 }; }), 'Scegli la risposta');
        card.appendChild(el('div', { class: 'esx-riga' }, [seg]));
        leggiRisposta = function () { var v = seg.valore(); return v == null ? null : v; };
        segna = function (giusto) { seg.blocca(); seg.classList.add(giusto ? 'ok' : 'ko'); };
      } else {
        var campi = q.campi.map(function (cp) {
          var inp = el('input', { class: 'esx-campo largo', inputmode: 'text', autocomplete: 'off', 'aria-label': cp.lab, style: 'width:6em' });
          card.appendChild(el('div', { class: 'esx-riga' }, [el('span', { class: 'esx-lab', text: cp.lab }), inp, cp.unita ? el('span', { class: 'esx-unita', text: cp.unita }) : null]));
          inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); rispondi.click(); } });
          return { cp: cp, inp: inp };
        });
        leggiRisposta = function () {
          var vuoto = campi.filter(function (c) { return !c.inp.value.trim(); })[0];
          if (vuoto) { vuoto.inp.focus(); return null; }
          return campi.map(function (c) { return numIt(c.inp.value); });
        };
        segna = function () { campi.forEach(function (c) { c.inp.disabled = true; c.inp.classList.add(c.ok ? 'ok' : 'ko'); }); };
        q._campi = campi;
      }
      var rispondi = el('button', { type: 'button', class: 'esx-btn', text: 'Rispondi' });
      var salto = el('button', { type: 'button', class: 'esx-btn sec', text: 'Non lo so, spiegamelo' });
      card.appendChild(el('div', { class: 'esx-comandi' }, [rispondi, salto]));
      domanda.appendChild(card);
      riapriPannello();
      var primo = card.querySelector('input'); if (primo && !stretto()) primo.focus({ preventScroll: true });
      try { card.scrollIntoView({ behavior: RIDUCI ? 'auto' : 'smooth', block: 'nearest' }); } catch (e0) {}
      function esito(giusto, saltata) {
        segna(giusto);
        rispondi.remove(); salto.remove();
        card.appendChild(el('p', { class: 'esx-v-esito ' + (giusto ? 'si' : 'no'), text: saltata ? 'Ecco come si fa.' : giusto ? 'Sì!' : 'No.' }));
        if (!giusto) {
          var rg = q.coord ? coord(q.coord.gradi, q.coord.primi, q.coord.dir) : q.scelte ? q.scelte[q.giusta] : q._campi.map(function (c) { var g = c.cp.giusto; return c.cp.lab + ' ' + (Math.abs(g) >= 1000 ? migliaia(g) : String(g).replace('.', ',').replace('-', '\u2212')) + (c.cp.unita && c.cp.unita.length < 6 ? c.cp.unita : ''); }).join(' \u00b7 ');
          var pg = el('p', { class: 'esx-v-giusta' }); pg.appendChild(document.createTextNode('Risposta giusta: ')); pg.appendChild(el('b', { text: rg }));
          card.appendChild(pg);
        }
        attesaRisposta = false;
        if (!suona) { suona = true; aggiornaPlay(); }
        parla(b.id + (giusto ? '-si' : '-no'), giusto ? q.si : q.no, function () {
          parla(b.id + '-spiega', q.spiega, function () {
            var av = el('button', { type: 'button', class: 'esx-btn', text: i >= bat.length - 1 ? 'Fine' : 'Continua' });
            av.addEventListener('click', function () { prossima(); });
            card.appendChild(el('div', { class: 'esx-comandi' }, [av]));
            setTimeout(function () { if (suona && domanda.contains(av)) prossima(); }, 2200);
          });
        });
      }
      rispondi.addEventListener('click', function () {
        var r = leggiRisposta(); if (r === null) return;
        var giusto;
        if (q.coord) {
          q._ok = { g: r.g === q.coord.gradi, p: vicinoA(r.p, q.coord.primi, q.coord.tolPrimi || 0) && r.p < 60, d: r.d === q.coord.dir };
          giusto = q._ok.g && q._ok.p && q._ok.d;
        } else if (q.scelte) giusto = r === q.giusta;
        else {
          giusto = true;
          q._campi.forEach(function (c, k2) {
            var x = r[k2], cp = c.cp;
            c.ok = vicinoA(x, cp.giusto, cp.tol || 0) || (cp.alt || []).some(function (y) { return vicinoA(x, y, cp.altTol || 0); });
            if (!c.ok) giusto = false;
          });
        }
        esito(giusto, false);
      });
      salto.addEventListener('click', function () { if (q.coord) { q._ok = { g: false, p: false, d: false }; q._coord[0].value = q.coord.gradi; q._coord[1].value = pad2(q.coord.primi); q._coord[2].value = q.coord.dir; segna(false); } else if (q.scelte) segna(false); else { q._campi.forEach(function (c) { c.ok = false; c.inp.value = String(c.cp.giusto).replace('.', ','); }); segna(false); } esito(false, true); });
    }
    function fine() {
      finito = true; suona = false; aggiornaPlay();
      scrivi(chiave(e, 'tutorial'), true);
      tacche.forEach(function (x) { x.b.className = (x.b.className.indexOf('dom') >= 0 ? 'dom ' : '') + 'fatto'; x.i.style.transform = 'scaleX(1)'; });
      var f = el('div', { class: 'esx-v-fine' });
      var rivedi = el('button', { type: 'button', class: 'esx-btn sec', text: 'Rivedi il video' });
      var allena = el('button', { type: 'button', class: 'esx-btn', text: 'Allenati: 15 esercizi' });
      rivedi.addEventListener('click', function () { suona = true; aggiornaPlay(); salta(0); });
      allena.addEventListener('click', versoAllenamento);
      f.appendChild(el('div', null, [el('h4', { text: 'Fine del video' }), el('p', { text: 'Ora prova da solo, con numeri sempre diversi.' }), el('div', { class: 'esx-comandi' }, [rivedi, allena])]));
      palco.appendChild(f);
      ccTesto.textContent = '';
    }

    /* ---------- comandi ---------- */
    function aggiornaPlay() { bPlay.innerHTML = suona ? ICO.pausa : ICO.play; bPlay.setAttribute('aria-label', suona ? 'Pausa' : 'Riproduci'); bPlay.title = suona ? 'Pausa' : 'Riproduci'; }
    function avvia() {
      if (grande.parentNode) { grande.remove(); suona = true; aggiornaPlay(); mostra(0); return; }
      if (finito) { suona = true; aggiornaPlay(); salta(0); return; }
      suona = true; aggiornaPlay();
      if (voce && voce.audio) voce.audio.play().catch(function () {});
      else if (!voce && !attesaRisposta) prossima();
    }
    function pausa() { suona = false; aggiornaPlay(); if (voce && voce.audio) voce.audio.pause(); }
    grande.addEventListener('click', avvia);
    bPlay.addEventListener('click', function () { if (suona) pausa(); else avvia(); });
    bInd.addEventListener('click', function () { if (grande.parentNode) { grande.remove(); } salta(i - 1); });
    bAv.addEventListener('click', function () { if (grande.parentNode) { grande.remove(); } salta(i + 1); });
    bRip.addEventListener('click', function () { if (grande.parentNode) { grande.remove(); suona = true; aggiornaPlay(); } ultimoP = null; salta(i); });
    bCC.addEventListener('click', function () { cc = !cc; bCC.setAttribute('aria-pressed', cc ? 'true' : 'false'); ccBox.classList.toggle('via', !cc); });
    bVel.addEventListener('click', function () { vel = vel === 1 ? 1.25 : vel === 1.25 ? 1.5 : 1; bVel.textContent = String(vel).replace('.', ',') + '×'; bVel.setAttribute('aria-pressed', vel !== 1 ? 'true' : 'false'); if (voce && voce.audio) voce.audio.playbackRate = vel; });
    function tasti(ev) {
      if (!document.body.contains(box)) { document.removeEventListener('keydown', tasti); return; }
      var tag = (ev.target && ev.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag)) return;
      var r = palco.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (ev.key === ' ' || ev.key === 'k') { ev.preventDefault(); if (suona) pausa(); else avvia(); }
    }
    document.addEventListener('keydown', tasti);
    // prima schermata: il disegno della prima battuta, fermo, con il pulsante grande
    scena(bat[0].p, false, false);
    ccTesto.textContent = '';
    aggiornaBarra(); aggiornaPlay();
    return function () { suona = false; fermaVoce(); t.ferma(); document.removeEventListener('keydown', tasti); };
  }
  // per i collaudi automatici
  try { window.UMS_ESERCIZI = { POSIZIONA: POSIZIONA, INDICI: INDICI, DENSITA_S: DENSITA_S, COMBINATO: COMBINATO, risposteI: risposteI, numIt: numIt, RETICOLO: RETICOLO, DENSITA: DENSITA, BANCA: BANCA, TASSI: TASSI, GRAFICO: GRAFICO, rispostaTassi: rispostaTassi, geometria: geometria, CITTA: CITTA, htmlScheda: htmlScheda, absLat: absLat, absLon: absLon }; } catch (e) {}
})();
