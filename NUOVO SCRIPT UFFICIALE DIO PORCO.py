!pip install -q beautifulsoup4

import os
import re
import json
import zipfile
from bs4 import BeautifulSoup
from google.colab import files

# =============================================================================
# UTILITY — PULIZIA TESTO
#   Rimuove artefatti tipo [cite], [cite start], [cite 7], [cite: 12] ecc.
#   che a volte restano nei testi generati dall'IA. NON tocca gli *asterischi*:
#   quelli servono da segnale per il grassetto e la conversione avviene lato
#   HTML/JS (dove si può anche decidere se preservare formattazione HTML
#   già presente nelle vecchie lezioni), non qui.
# =============================================================================
CITE_RE = re.compile(r'\[\s*cite[^\]]*\]', re.IGNORECASE)

def pulisci_testo(s):
    if not isinstance(s, str):
        return s
    s = CITE_RE.sub('', s)
    s = re.sub(r'[ \t]{2,}', ' ', s)     # spazi doppi lasciati dalla rimozione
    s = re.sub(r'[ \t]+\n', '\n', s)     # spazi prima di un a-capo
    return s.strip()

def pulisci_ricorsivo(obj):
    """Applica pulisci_testo a ogni stringa annidata in dict/list, ricorsivamente."""
    if isinstance(obj, dict):
        return {k: pulisci_ricorsivo(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [pulisci_ricorsivo(v) for v in obj]
    if isinstance(obj, str):
        return pulisci_testo(obj)
    return obj

# =============================================================================
# 1. CARICA IL FILE DEGLI URL
#    Formato atteso: righe con "Podcast [Materia] N [tab] URL" e
#    "sezione video sintesi:" seguito da "[Materia] - Lezione N [tab] URL"
# =============================================================================
print("📎 Carica il file degli URL (podcast e video sintesi):")
url_upload = files.upload()
url_filename = list(url_upload.keys())[0]
url_raw = url_upload[url_filename].decode('utf-8')

# =============================================================================
# 2. CARICA IL FILE (O I FILE) DEL SUPER QUIZ — formato .txt
#    Riconosce sia la numerazione continua delle domande (Q1..Q80 su tutto
#    il file) sia quella che riparte da Q1 ad ogni lezione: il numero dopo
#    la "Q" NON viene MAI usato per capire a quale lezione appartiene una
#    domanda. Conta solo sotto quale header "LEZIONE N" ricade il blocco.
# =============================================================================
print("\n🧠 Carica il file (o i file) di testo del Super Quiz:")
quiz_upload = files.upload()

LEZIONE_HEADER_RE = re.compile(r'^\s*LEZIONE\s+(\d+)\b[^\n]*$', re.IGNORECASE | re.MULTILINE)

# Ogni domanda, nei file forniti, sta tutta su una riga nel formato:
# "Qn: <domanda> A) <opz A> B) <opz B> C) <opz C> CORRETTA: X SPIEGAZIONE: <testo>"
# La regex però non assume una singola riga: usa DOTALL + lookahead sulla
# prossima "Qn:" (o fine blocco), quindi funziona anche se in futuro una
# domanda dovesse andare a capo.
Q_BLOCK_RE = re.compile(
    r'Q\s*\d+\s*:\s*(?P<domanda>.*?)\s*'
    r'A\)\s*(?P<a>.*?)\s*'
    r'B\)\s*(?P<b>.*?)\s*'
    r'C\)\s*(?P<c>.*?)\s*'
    r'CORRETTA\s*:\s*(?P<corretta>[ABC])\s*'
    r'SPIEGAZIONE\s*:\s*(?P<spiegazione>.*?)'
    r'(?=(?:Q\s*\d+\s*:)|\Z)',
    re.IGNORECASE | re.DOTALL
)

def parse_super_quiz(raw_text):
    """
    Ritorna un dizionario {numero_lezione (int): [domande...]}.
    Ogni "domanda" è un dict pronto per il JSON finale:
    {"domanda": ..., "opzioni": [{"testo":..., "corretta": bool} x3], "spiegazione": ...}
    """
    quiz_map = {}
    headers = list(LEZIONE_HEADER_RE.finditer(raw_text))

    segmenti = []
    if headers:
        primo_inizio = headers[0].start()
        if raw_text[:primo_inizio].strip():
            # testo prima del primo header "LEZIONE N": non sappiamo a chi
            # appartiene, lo segnaliamo e lo scartiamo (num_lez=None)
            segmenti.append((None, raw_text[:primo_inizio]))
        for i, h in enumerate(headers):
            num = int(h.group(1))
            fine = headers[i + 1].start() if i + 1 < len(headers) else len(raw_text)
            segmenti.append((num, raw_text[h.end():fine]))
    else:
        # nessun header "LEZIONE N" nel file: impossibile assegnare le domande
        segmenti.append((None, raw_text))

    domande_scartate = 0
    for num_lez, blocco in segmenti:
        matches = list(Q_BLOCK_RE.finditer(blocco))
        if num_lez is None:
            domande_scartate += len(matches)
            continue
        for m in matches:
            domanda = pulisci_testo(m.group('domanda'))
            opz_testi = {
                'A': pulisci_testo(m.group('a')),
                'B': pulisci_testo(m.group('b')),
                'C': pulisci_testo(m.group('c')),
            }
            corretta = m.group('corretta').upper()
            spiegazione = pulisci_testo(m.group('spiegazione'))
            opzioni = [
                {"testo": opz_testi[k], "corretta": (k == corretta)}
                for k in ('A', 'B', 'C')
            ]
            quiz_map.setdefault(num_lez, []).append({
                "domanda": domanda,
                "opzioni": opzioni,
                "spiegazione": spiegazione
            })

    if domande_scartate:
        print(f"   ⚠️ {domande_scartate} domande scartate: comparivano prima di qualsiasi intestazione 'LEZIONE N'.")
    return quiz_map

super_quiz_map = {}
for fname, raw in quiz_upload.items():
    testo = raw.decode('utf-8')
    parziale = parse_super_quiz(testo)
    for num, domande in parziale.items():
        super_quiz_map.setdefault(num, []).extend(domande)

tot_domande = sum(len(v) for v in super_quiz_map.values())
print(f"📚 Super Quiz caricato — {tot_domande} domande totali su {len(super_quiz_map)} lezioni: {sorted(super_quiz_map.keys())}")

# =============================================================================
# 3. CARICA I FILE HTML DELLE LEZIONI (vecchio formato con source-riassunto)
# =============================================================================
print("\n📂 Carica i file HTML delle lezioni (puoi selezionarli in massa):")
uploaded = files.upload()
html_files = {k: v for k, v in uploaded.items() if k.lower().endswith('.html')}

if not html_files:
    print("❌ ERRORE: Nessun file HTML rilevato. Riavvia la cella.")
else:
    print(f"\n✅ Rilevati {len(html_files)} file HTML da processare.")

    # =========================================================================
    # CONVERSIONE URL → FORMATO EMBED
    # Gestisce studio.youtube.com, youtube.com/watch?v=, youtu.be/
    # =========================================================================
    def converti_embed(url):
        if not url or url.strip() in ("", "PLACEHOLDER_VIDEO", "PLACEHOLDER_PODCAST"):
            return ""
        m = re.search(r'studio\.youtube\.com/video/([A-Za-z0-9_\-]+)', url)
        if m:
            return f"https://www.youtube.com/embed/{m.group(1)}"
        m = re.search(r'youtube\.com/watch\?v=([A-Za-z0-9_\-]+)', url)
        if m:
            return f"https://www.youtube.com/embed/{m.group(1)}"
        m = re.search(r'youtu\.be/([A-Za-z0-9_\-]+)', url)
        if m:
            return f"https://www.youtube.com/embed/{m.group(1)}"
        return url  # Già embed o URL non YouTube: lascia invariato

    # =========================================================================
    # PARSING DEL FILE URL
    # Costruisce due dizionari {numero_lezione (int) → url_embed}
    # uno per i podcast e uno per i video sintesi.
    # La sezione viene rilevata dalla parola chiave "Podcast" nella riga o
    # dall'intestazione "sezione video sintesi".
    # =========================================================================
    podcast_map = {}
    video_map   = {}
    sezione_corrente = None

    for riga in url_raw.splitlines():
        riga = riga.strip()
        if not riga:
            continue

        riga_lower = riga.lower()

        # Cambia sezione su righe senza URL
        if 'http' not in riga_lower:
            if 'podcast' in riga_lower:
                sezione_corrente = 'podcast'
            elif 'video' in riga_lower or 'lezione' in riga_lower:
                sezione_corrente = 'video'
            continue

        # Cerca un URL nella riga
        url_match = re.search(r'https?://\S+', riga)
        if not url_match:
            continue
        url_embed = converti_embed(url_match.group(0).rstrip('.,;'))

        # Cerca il numero di lezione nel testo prima dell'URL
        testo_prima = riga[:url_match.start()]
        num_match = re.search(r'\b(\d+)\b', testo_prima)
        if not num_match:
            continue
        n = int(num_match.group(1))

        # Determina la sezione se non ancora impostata
        if sezione_corrente is None:
            sezione_corrente = 'podcast' if 'podcast' in riga_lower else 'video'

        if 'podcast' in riga_lower:
            podcast_map[n] = url_embed
        elif sezione_corrente == 'podcast':
            # Prima riga non-podcast dentro sezione podcast → cambia sezione
            sezione_corrente = 'video'
            video_map[n] = url_embed
        else:
            video_map[n] = url_embed

    print(f"\n📋 URL mappati — Podcast: {sorted(podcast_map.keys())} | Video: {sorted(video_map.keys())}")

    # =========================================================================
    # ESTRAZIONE DATI DAL FILE HTML (vecchio formato con source-riassunto)
    # Schema output: identico al JSON letto dal template lezione-dinamica.html
    # =========================================================================
    LABEL_CHECKPOINT_RE = re.compile(r'^\s*check\s*point\s*:?\s*$', re.IGNORECASE)

    def estrai_dati_master(html_content):
        soup = BeautifulSoup(html_content, 'html.parser')

        dati = {
            "titolo_lezione": "",
            "sottotitolo": "",
            "orientamento": {
                "obiettivi": [],
                "concetto_fondamentale": {"titolo": "", "testo": ""},
                "nota_extra": {"titolo": "", "testo": ""},
                "domande_autovalutazione": []
            },
            "punti_chiave": [],
            "podcast_url": "",
            "video_sintesi_url": "PLACEHOLDER_VIDEO",
            "flashcards": [],
            "riassuntone": [],
            "il_super_quiz": [],
            "assistente_ia": {
                "nome": "Assistente IA",
                "sottotesto": "Cosa non ti è chiaro? Chiedimelo...",
                "url": ""
            }
        }

        # --- TITOLO & SOTTOTITOLO ---
        h1 = soup.find('h1')
        if h1:
            dati["titolo_lezione"] = h1.get_text(strip=True)

        sub = soup.find('div', class_='subtitle')
        if sub:
            dati["sottotitolo"] = sub.get_text(strip=True)

        # --- OBIETTIVI ---
        obj_lists = soup.select('.obj-list')
        if len(obj_lists) > 0:
            dati["orientamento"]["obiettivi"] = [
                li.get_text(strip=True)
                for li in obj_lists[0].find_all('li')
                if li.get_text(strip=True)
            ]

        # --- CONCETTO FONDAMENTALE ---
        def_box = soup.find('div', class_='definition-box')
        if def_box:
            strong = def_box.find('strong')
            titolo = strong.get_text(strip=True).rstrip(':') if strong else ""
            for br in def_box.find_all('br'):
                br.replace_with(' ')
            if strong:
                strong.extract()
            testo = def_box.get_text(strip=True)
            dati["orientamento"]["concetto_fondamentale"] = {"titolo": titolo, "testo": testo}

        # --- NOTA EXTRA ---
        nota_extra = soup.find(
            lambda tag: tag.name == "div"
            and tag.has_attr("style")
            and "#fdf6e3" in tag["style"].lower()
        )
        if nota_extra:
            strong = nota_extra.find('strong')
            titolo = strong.get_text(strip=True).rstrip(':') if strong else ""
            for br in nota_extra.find_all('br'):
                br.replace_with(' ')
            if strong:
                strong.extract()
            testo = nota_extra.get_text(strip=True)
            dati["orientamento"]["nota_extra"] = {"titolo": titolo, "testo": testo}

        # --- DOMANDE AUTOVALUTAZIONE ---
        if len(obj_lists) > 1:
            dati["orientamento"]["domande_autovalutazione"] = [
                li.get_text(strip=True)
                for li in obj_lists[1].find_all('li')
                if li.get_text(strip=True)
            ]

        # --- PUNTI CHIAVE ---
        factors_js = {}
        factors_match = re.search(r'const factorsData\s*=\s*\{(.*?)\};', html_content, re.DOTALL)
        if factors_match:
            pattern = r'(\w+):\s*\{\s*title:\s*["\']([^"\']+)["\'],\s*body:\s*`([^`]+)`\s*\}'
            for key, title, body in re.findall(pattern, factors_match.group(1)):
                factors_js[key] = {"titolo_esteso": title.strip(), "testo_modale": body.strip()}

        for card in soup.select('.factor-card'):
            onclick = card.get('onclick', '')
            m = re.search(r"openFactor\('([^']+)'\)", onclick)
            card_id = m.group(1) if m else ""
            t_breve = card.find('strong')
            sotto = card.find('small')
            js_data = factors_js.get(card_id, {})
            dati["punti_chiave"].append({
                "id": card_id,
                "titolo_breve": t_breve.get_text(strip=True) if t_breve else "",
                "sottotitolo": sotto.get_text(strip=True) if sotto else "",
                "titolo_esteso": js_data.get("titolo_esteso", t_breve.get_text(strip=True) if t_breve else ""),
                "testo_modale": js_data.get("testo_modale", "")
            })

        # --- FLASHCARDS ---
        cards_match = re.search(r'const initialCards\s*=\s*\[(.*?)\];', html_content, re.DOTALL)
        if cards_match:
            pairs = re.findall(r'front:\s*`([^`]+)`,\s*back:\s*`([^`]+)`', cards_match.group(1))
            for front, back in pairs:
                dati["flashcards"].append({"front": front.strip(), "back": back.strip()})

        # --- RIASSUNTONE ---
        riassunto = soup.find(id='source-riassunto')
        if riassunto:
            for h3 in riassunto.find_all('h3'):
                testo_p = h3.find_next_sibling('p')
                testo = testo_p.get_text(strip=True) if testo_p else ""
                cornell = h3.find_next_sibling('div', class_='cornell-box')
                cps = []
                if cornell:
                    # FIX — alcune sorgenti non hanno una vera domanda davanti alla
                    # PRIMA risposta: c'è solo l'etichetta "Check point:" seguita
                    # subito dalla risposta (vedi screenshot). Il vecchio codice
                    # filtrava quell'etichetta PRIMA di fare lo zip domande/risposte:
                    # questo sfalsava di una posizione tutte le coppie successive,
                    # perdendo l'ultima risposta del blocco.
                    # Qui invece si scorre il box in ordine reale
                    # (domanda -> risposta -> domanda -> risposta...): se una
                    # "domanda" è solo l'etichetta, diventa stringa vuota MA
                    # SENZA saltare lo slot, così l'abbinamento resta corretto
                    # qualunque sia il numero di coppie nel box.
                    domanda_corrente = ""
                    for p in cornell.find_all('p'):
                        classi = p.get('class') or []
                        testo_p_corrente = p.get_text(strip=True)
                        if 'cornell-question' in classi:
                            domanda_corrente = "" if LABEL_CHECKPOINT_RE.match(testo_p_corrente) else testo_p_corrente
                        elif 'cornell-answer' in classi:
                            risposta = testo_p_corrente.replace('Risposta: ', '').strip()
                            cps.append({"domanda": domanda_corrente, "risposta": risposta})
                            domanda_corrente = ""
                dati["riassuntone"].append({
                    "titolo": h3.get_text(strip=True),
                    "testo": testo,
                    "check_points": cps
                })

        # --- ASSISTENTE IA ---
        ia_url = ""
        ia_container = soup.select_one('.freud-bot-container, .ia-container, .ia-text-col')
        if ia_container:
            a_tag = ia_container.find('a', href=True)
            if a_tag and 'notebooklm.google.com' in a_tag['href']:
                ia_url = a_tag['href']
        if not ia_url:
            for a in soup.find_all('a', href=True):
                if 'notebooklm.google.com' in a['href']:
                    ia_url = a['href']
                    break

        dati["assistente_ia"]["url"] = ia_url

        return dati

    # =========================================================================
    # LOOP PRINCIPALE
    # =========================================================================
    json_generati = []

    for filename, contenuto in html_files.items():
        print(f"\n{'='*50}")
        print(f"📄 Processo: {filename}")
        print(f"{'='*50}")

        try:
            html_content = contenuto.decode('utf-8')
            dati = estrai_dati_master(html_content)

            # --- RILEVA NUMERO DI LEZIONE per iniettare URL e Super Quiz ---
            num_lez = None
            num_match = re.search(r'\bLezione\s+(\d+)\b', dati.get("sottotitolo", ""), re.IGNORECASE)
            if num_match:
                num_lez = int(num_match.group(1))

            if num_lez is None:
                num_match = re.search(r'(\d+)', filename)
                if num_match:
                    num_lez = int(num_match.group(1))

            if num_lez is None:
                print(f"   ⚠️ Impossibile rilevare il numero di lezione. URL e Super Quiz non iniettati.")
            else:
                print(f"   🔢 Lezione {num_lez} rilevata.")

                # Podcast
                if num_lez in podcast_map:
                    dati["podcast_url"] = podcast_map[num_lez]
                    print(f"   🎙️ podcast_url → {podcast_map[num_lez]}")
                else:
                    print(f"   ⚠️ Nessun URL podcast per lezione {num_lez}. Campo lasciato vuoto.")

                # Video sintesi
                if num_lez in video_map:
                    dati["video_sintesi_url"] = video_map[num_lez]
                    print(f"   🎬 video_sintesi_url → {video_map[num_lez]}")
                else:
                    print(f"   ⚠️ Nessun URL video per lezione {num_lez}. Campo lasciato a PLACEHOLDER_VIDEO.")

                # Super Quiz
                if num_lez in super_quiz_map:
                    dati["il_super_quiz"] = super_quiz_map[num_lez]
                    print(f"   🧠 il_super_quiz → {len(super_quiz_map[num_lez])} domande")
                else:
                    print(f"   ⚠️ Nessun Super Quiz trovato per lezione {num_lez}. Campo lasciato vuoto.")

            # --- PULIZIA FINALE (rimuove [cite]... da tutti i campi testuali) ---
            dati = pulisci_ricorsivo(dati)

            # --- SALVA JSON ---
            nome_base = os.path.splitext(filename)[0]
            output_name = nome_base + '.json'
            with open(output_name, 'w', encoding='utf-8') as f:
                json.dump(dati, f, ensure_ascii=False, indent=4)

            json_generati.append(output_name)
            print(f"   ✅ {len(dati['flashcards'])} flashcard | {len(dati['riassuntone'])} macro-argomenti | "
                  f"{len(dati['punti_chiave'])} punti chiave | {len(dati['il_super_quiz'])} domande quiz")
            print(f"   💾 Salvato: {output_name}")

        except Exception as e:
            print(f"   ❌ Errore durante l'elaborazione di {filename}: {e}")

    # =========================================================================
    # DOWNLOAD — ZIP con tutti i JSON generati
    # =========================================================================
    if json_generati:
        zip_name = "lezioni_complete.zip"
        with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zf:
            for nome in json_generati:
                zf.write(nome)

        print(f"\n{'='*50}")
        print(f"🎉 COMPLETATO: {len(json_generati)} lezioni processate.")
        print(f"🚀 Download in corso: {zip_name}")
        print(f"{'='*50}")
        files.download(zip_name)
    else:
        print("\n⚠️ Nessun JSON generato. Controlla gli errori sopra.")
