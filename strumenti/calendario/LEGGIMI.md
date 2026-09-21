# Calendario delle lezioni — come si aggiorna

1. Vai su https://unimc-public.prod.up.cineca.it/ → filtro Corso di studio: Scienze della formazione primaria.
2. Esporta ICS a fette di ~2 settimane (limite 150 impegni per export) e salva i file nella cartella `ics/` (sovrascrivi i vecchi).
3. Da terminale, nella cartella `strumenti/calendario/`: `python3 costruisci-calendario.py`
4. Il file `calendario-lezioni.json` nella radice del sito viene rigenerato. Aggiorna la data in `"aggiornato"` se serve (è nello script, in fondo).
5. Carica su GitHub `calendario-lezioni.json` (e i nuovi .ics se vuoi tenerli).

La divisione A-L / M-Z e i gruppi dei laboratori NON sono nell'export: lo script li ricava dagli orari (giorno + ora) presi dalle tabelle ufficiali del dipartimento. Se l'università cambia gli orari dei gruppi, va aggiornata la funzione `gruppo()` nello script.
