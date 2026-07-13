# Una Mano Spensierata — Lezione Dinamica

## Struttura del progetto

```
index.html      → solo struttura HTML + 3 pezzi che DEVONO restare inline
css/ums.css     → TUTTO lo stile, in 16 sezioni numerate
js/ums.js       → TUTTO il JavaScript, in 14 sezioni numerate
```

### I 3 pezzi rimasti inline in index.html (non spostarli!)

1. **`<style id="ums-preload-guard">`** (nel `<head>`) — guardia anti-flash:
   nasconde gli elementi animati prima del primo paint. Deve stare PRIMA
   del link a `ums.css`, che contiene le regole che li "riaccendono".
2. **Lo script night-mode di una riga** (subito dopo `<body>`) — applica il
   tema scuro salvato PRIMA che la pagina si disegni, per evitare il lampo
   bianco.
3. **Lo script del boot screen** (subito dopo l'HTML `#ums-boot`) — gestisce
   il caricamento del font sulla splash dell'app installata.

### Ordine di caricamento in fondo al body (non invertirlo!)

`js/ums.js` deve caricare PRIMA del tag Google Translate: la callback
`googleTranslateElementInit` che Google invoca è definita dentro `ums.js`.

## LA REGOLA DELLA CASA (anti-debito)

> **Niente nuovi "blocchi additivi".** Una modifica si fa nella sezione del
> componente a cui appartiene, **cancellando** la regola che sostituisce.
> Un blocco nuovo in coda è ammesso SOLO per una funzionalità nuova — e
> quando la funzionalità è consolidata, il blocco si fonde nella sezione
> giusta.

Questa regola vale anche (soprattutto) per le modifiche fatte con l'IA:
incollare questo README all'inizio della richiesta aiuta il modello a
rispettarla.

## Dove vivono le cose (zone calde)

| Cosa | Dove |
|---|---|
| Altezze della lavagna | `css/ums.css`, sezione 1, blocco "TASK 4 — SMART WHITEBOARD" (token in `:root`) |
| Layout riassuntone + bloc notes | `css/ums.css`, sezione 16 (`ums-riass-layout-style`) |
| Dimensioni strutturali (topbar, sticky, lavagna) | `css/ums.css`, `:root` in cima: `--topbar-h`, `--sticky-gap`, `--wb-h`, `--wb-h-aperta` |
| Funzioni della lavagna (`wbMaximize`, `wbAddEntry`…) | `js/ums.js`, sezione 3 (script principale) |
| Persistenza appunti/evidenziazioni | `js/ums.js`, sezione 3, cercare `umsPersistState` |

## Cosa è stato rimosso nel consolidamento (gennaio 2026 → luglio 2026)

- **Feature morta "lavagna espandibile"**: CSS di `.wb-expand-btn` e
  `.wb-expanded`, più la funzione JS `wbToggleExpand` — il pulsante non
  esisteva più nell'HTML da tempo.
- **Vecchio fix "riassuntone in cornice a scroll interno"** e il suo
  neutralizzatore: si annullavano a vicenda, superati dal layout a tutta
  larghezza (sezione 16).
- **Tre definizioni duplicate dell'altezza della lavagna** (220px base,
  520px nei ritocchi, 340px nel capitolo): ora una sola fonte di verità
  nel blocco TASK 4, coi token.

## Debito residuo noto (accettato, per ora)

- ~90 `!important` sparsi: si riducono componente per componente, quando
  si tocca quella zona — non in blocco.
- 69 `onclick` inline nell'HTML: funzionano, ma accoppiano markup e logica.
- Il markup del bloc notes è duplicato in 4 sezioni.
- `manifest.json` e `icons/` sono referenziati ma non presenti nel
  repository (pre-esistente).

## Prima di ogni pubblicazione

Esegui `CHECKLIST-REGRESSIONE.md`. Sono 12 controlli manuali, ~5 minuti.
