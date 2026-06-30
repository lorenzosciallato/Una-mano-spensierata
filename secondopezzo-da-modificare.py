import os
import json
import csv
import re
from bs4 import BeautifulSoup
from groq import Groq
from google.colab import files
import getpass

# 1. Inserimento sicuro della API Key di Groq
print("🔑 Inserisci la tua API Key di GROQ (inizia con gsk_...):")
api_key = getpass.getpass()

# Inizializziamo il Client di Groq
client = Groq(api_key=api_key)

# 2. Caricamento file
print("\n📂 Clicca su 'Scegli file' e carica il tuo file HTML e i CSV di YouTube (puoi selezionarli tutti insieme):")
uploaded = files.upload()

# 3. Separazione dei file caricati
html_file = None
csv_files = []

for filename in uploaded.keys():
    if filename.endswith('.html'):
        html_file = filename
    elif filename.endswith('.csv'):
        csv_files.append(filename)

if not html_file:
    print("❌ ERRORE: Non hai caricato nessun file HTML. Riavvia la cella.")
elif not csv_files:
    print("❌ ERRORE: Non hai caricato nessun file CSV. Riavvia la cella.")
else:
    print(f"\n✅ File riconosciuti: 1 HTML ({html_file}) e {len(csv_files)} CSV.")
    
    # --- FUNZIONI DI ELABORAZIONE ---
    def estrai_dati_html(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
            
        # Estraiamo materia e titolo
        titolo_tag = soup.find('title')
        titolo_lezione = titolo_tag.text if titolo_tag else "Titolo Sconosciuto"
        
        h1_tag = soup.find('h1')
        materia = h1_tag.text if h1_tag else ""
        
        testo_completo = soup.get_text(separator=' ', strip=True)
        return materia, titolo_lezione, testo_completo

    def processa_video(materia, titolo_lezione, csv_list):
        video_trovati = []
        
        # 1. Trova il numero esatto della lezione
        match_num = re.search(r'\b\d+\b', titolo_lezione)
        num_lezione = match_num.group() if match_num else None
        
        # 2. Ricava le parole chiave della materia
        parole_materia = [parola for parola in re.split(r'\W+', materia.lower()) if len(parola) > 3]
        
        for csv_path in csv_list:
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    if not row or len(row) < 2: continue
                    titolo_video = row[0]
                    link_modifica = row[1]
                    
                    match_id = re.search(r'/video/([^/]+)/edit', link_modifica)
                    if not match_id: continue
                    video_id = match_id.group(1)
                    
                    titolo_lower = titolo_video.lower()
                    is_pertinente = False
                    
                    if num_lezione and parole_materia:
                        ha_numero = bool(re.search(rf'\b{num_lezione}\b', titolo_lower))
                        ha_materia = any(kw in titolo_lower for kw in parole_materia)
                        
                        if ha_numero and ha_materia:
                            is_pertinente = True
                            
                    elif num_lezione:
                        if re.search(rf'\b{num_lezione}\b', titolo_lower):
                            is_pertinente = True
                            
                    if is_pertinente:
                        tipo_video = "podcast" if "podcast" in titolo_lower else "video_sintesi"
                        video_trovati.append({
                            "titolo_video": titolo_video,
                            "tipo": tipo_video,
                            "embed_url": f"https://www.youtube.com/embed/{video_id}"
                        })
                        
        return video_trovati

    def genera_quiz(testo_lezione, api_client):
        prompt = f"""
        Sei un esperto di Instructional Design. Basandoti sul seguente testo di una lezione, 
        genera "Il Super Quiz": 30 domande a risposta multipla. 
        Le opzioni errate (distrattori) devono essere molto verosimili e mettere in difficoltà lo studente.
        
        Devi restituire ESCLUSIVAMENTE un oggetto JSON. Non aggiungere commenti o testo fuori dal JSON.
        Questa è la struttura esatta che devi usare:
        {{
            "il_super_quiz": [
                {{
                    "domanda": "Testo della domanda?",
                    "opzioni": [
                        {{"testo": "Opzione A", "corretta": false, "spiegazione": "Sbagliata perché..."}},
                        {{"testo": "Opzione B", "corretta": true, "spiegazione": "Corretta perché..."}},
                        {{"testo": "Opzione C", "corretta": false, "spiegazione": "Sbagliata perché..."}},
                        {{"testo": "Opzione D", "corretta": false, "spiegazione": "Sbagliata perché..."}}
                    ]
                }}
            ]
        }}
        
        Testo della lezione (leggilo attentamente):
        {testo_lezione[:20000]}
        """
        
        # Chiamata a Groq aggiornata al nuovo modello Llama 3.3 70B
        chat_completion = api_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.3 
        )
        
        risposta_json = json.loads(chat_completion.choices[0].message.content)
        return risposta_json["il_super_quiz"]

    # --- ESECUZIONE ---
    print("\n⏳ Analisi dell'HTML e accoppiamento video in corso...")
    materia, titolo, testo = estrai_dati_html(html_file)
    videos = processa_video(materia, titolo, csv_files)
    
    print(f"✅ Rilevata materia: '{materia}' | Lezione dedotta: '{titolo}'")
    print(f"✅ Trovati {len(videos)} video pertinenti.")
    
    print("\n🧠 Sto interrogando Llama 3.3 via Groq per le 30 domande a trabocchetto...")
    print("⏳ Tieni duro, sta elaborando (di solito Groq ci mette pochissimi secondi!)...")
    
    try:
        quiz = genera_quiz(testo, client)
        
        dati_finali = {
            "materia_estratta": materia,
            "titolo_lezione": titolo,
            "media": videos,
            "il_super_quiz": quiz
        }
        
        output_filename = "dati_lezione_quiz_groq.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(dati_finali, f, ensure_ascii=False, indent=4)
            
        print(f"\n🎉 MAGIA COMPLETATA! Sto scaricando il file '{output_filename}' sul tuo computer.")
        files.download(output_filename)
        
    except Exception as e:
        print(f"\n❌ Si è verificato un errore con l'intelligenza artificiale: {e}")
