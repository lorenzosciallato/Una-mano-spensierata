# Guida GitHub passo passo — da zero alla pagina online

Tempo richiesto: 15-20 minuti la prima volta. Serve solo il browser,
niente da installare.

---

## PARTE 1 — Creare l'account (salta se ce l'hai già)

1. Vai su **https://github.com** e clicca **Sign up** in alto a destra.
2. Inserisci email, password e un nome utente (sarà nell'indirizzo del
   tuo sito: scegli qualcosa di presentabile, es. `lorenzo-ums`).
3. Conferma l'email cliccando il link che ti arriva. Fatto.

## PARTE 2 — Creare il repository (la "cartella" del progetto)

4. In alto a destra clicca il **+** → **New repository**.
5. Compila così:
   - **Repository name**: `ums-lezione` (o come preferisci: minuscole,
     niente spazi — usa i trattini)
   - **Description** (facoltativa): "Piattaforma studio Una Mano Spensierata"
   - Seleziona **Public** (necessario per il sito gratuito, vedi Parte 4)
   - NON spuntare "Add a README file": lo carichiamo noi
6. Clicca il bottone verde **Create repository**.

## PARTE 3 — Caricare i file

Ti trovi su una pagina che dice "Quick setup". 

7. Clicca il link **uploading an existing file** (a metà pagina).
8. Sul tuo computer apri la cartella `ums` che ti ho preparato. Dentro vedi:
   `index.html`, `README.md`, `CHECKLIST-REGRESSIONE.md`, `GUIDA-GITHUB.md`
   e le due cartelle `css` e `js`.
9. **Seleziona TUTTO il contenuto della cartella** (Ctrl+A / Cmd+A) e
   **trascinalo** nel riquadro tratteggiato della pagina GitHub.
   Importante: trascina i file e le cartelle `css`/`js`, NON la cartella
   `ums` intera — `index.html` deve stare al primo livello del repository.
10. Aspetta che tutti i file compaiano in lista (anche `css/ums.css` e
    `js/ums.js`: GitHub mantiene le cartelle).
11. In basso, nel campo sotto "Commit changes", scrivi una breve
    descrizione, es.: `Prima versione — struttura consolidata`.
    Ogni caricamento su GitHub si chiama "commit" ed è come un salvataggio
    con etichetta: potrai sempre tornare indietro.
12. Clicca il bottone verde **Commit changes**.

## PARTE 4 — Mettere il sito online (GitHub Pages, gratis)

13. Nel tuo repository, clicca la scheda **Settings** (in alto, con
    l'ingranaggio).
14. Nel menu a sinistra clicca **Pages**.
15. Sotto "Build and deployment" → "Source" lascia **Deploy from a branch**.
16. Sotto "Branch": seleziona **main** e la cartella **/ (root)**,
    poi clicca **Save**.
17. Aspetta 1-2 minuti e ricarica la pagina: in alto comparirà un
    riquadro con l'indirizzo del tuo sito, tipo:
    `https://TUONOME.github.io/ums-lezione/`
18. Aprilo: la tua pagina è online. Salvati il link.

## PARTE 5 — Aggiornare i file in futuro (il ciclo di lavoro)

Quando modifichi qualcosa (tu o l'IA):

19. Prima di caricare: esegui la **CHECKLIST-REGRESSIONE.md** in locale.
20. Vai nel repository, entra nel file da sostituire (es. clicca su
    `css` → `ums.css`), poi:
    - per **sostituirlo**: torna nella cartella, clicca **Add file →
      Upload files**, trascina la nuova versione (stesso nome!) e fai
      Commit. GitHub sovrascrive e conserva la versione precedente.
    - per **piccole modifiche a mano**: dentro il file clicca l'icona
      della **matita** (Edit), modifica e fai **Commit changes**.
21. Il sito su github.io si aggiorna da solo in 1-2 minuti.

## Le 4 parole da conoscere

- **Repository (repo)**: la cartella del progetto su GitHub.
- **Commit**: un salvataggio etichettato. La cronologia dei commit
  (scheda "Commits") è la tua macchina del tempo: puoi vedere e
  recuperare ogni versione passata di ogni file.
- **Branch**: una "linea" di lavoro. Per ora ne usi una sola, `main`.
- **GitHub Pages**: il servizio gratuito che trasforma il repo in un
  sito pubblico.

## Se qualcosa va storto

- Il sito mostra la pagina ma "spoglia" (senza stile)? Quasi sempre
  significa che `css/ums.css` non è al posto giusto: controlla che nel
  repo esista la cartella `css` con dentro `ums.css` (e `js/ums.js`).
- Hai caricato la cartella `ums` intera per sbaglio? Il sito sarà su
  `.../ums-lezione/ums/` invece che su `.../ums-lezione/`. Rimedio:
  cancella tutto (Settings → in fondo → Delete this repository) e
  ripeti dalla Parte 2, oppure sposta i file.
- Hai rotto qualcosa con un commit? Scheda **Commits** → apri il commit
  precedente → puoi vedere e ricopiare i file com'erano prima.
