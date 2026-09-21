import re,glob,json,os
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
ROME=ZoneInfo("Europe/Rome")
seen={}
for f in glob.glob(os.path.join(os.path.dirname(__file__),'ics','*.ics')):
    txt=open(f,encoding='utf-8').read().replace('\r\n ','')
    for e in re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT',txt,re.S):
        d=dict(re.findall(r'^(\w+):(.*)$',e,re.M))
        key=(d['DTSTART'],d['DTEND'],d['SUMMARY'],d.get('DESCRIPTION',''),d.get('LOCATION',''))
        seen[key]=d

def tit(s):
    s=s.strip()
    parts=s.split()
    out=[]
    for p in parts:
        if "'" in p:
            a,b=p.split("'",1); out.append(a.capitalize()+"'"+b.capitalize())
        else: out.append(p.capitalize())
    return " ".join(out)

def mat_name(summary):
    s=summary.strip()
    s=re.sub(r"\s+"," ",s)
    M={
     "BIOLOGIA GENERALE":"Biologia generale",
     "DIDATTICA DELLA MATEMATICA":"Didattica della matematica",
     "EDUCAZIONE ALL'IMMAGINE":"Educazione all'immagine",
     "EDUCAZIONE ALL'IMMAGINE - LABORATORIO DI EDUCAZIONE ALL'IMMAGINE":"Lab. Educazione all'immagine",
     "EDUCAZIONE AMBIENTALE":"Educazione ambientale",
     "EDUCAZIONE MOTORIA":"Educazione motoria",
     "ETICA PROFESSIONALE":"Etica professionale",
     "GEOGRAFIA":"Geografia",
     "GRAMMATICA ITALIANA":"Grammatica italiana",
     "GRAMMATICA ITALIANA - LABORATORIO DI GRAMMATICA ITALIANA":"Lab. Grammatica italiana",
     "LA GESTIONE DELLA CLASSE MULTIETNICA E PLURILINGUE":"La gestione della classe multietnica e plurilingue",
     "LABORATORIO DI LINGUA INGLESE III":"Lab. Lingua inglese III",
     "LABORATORIO DI LINGUA INGLESE V":"Lab. Lingua inglese V",
     "LETTERATURA ITALIANA - MOD.1: LETTERATURA ITALIANA 1":"Letteratura italiana – Mod. 1",
     "LETTORATO DI LINGUA INGLESE DI BASE":"Lettorato di lingua inglese di base",
     "LETTORATO PER LABORATORIO DI LINGUA INGLESE III - B1plus":"Lettorato Lab. Inglese III (B1+)",
     "LETTORATO PER LABORATORIO DI LINGUA INGLESE V - B2 - LAB. V e PROV":"Lettorato Lab. Inglese V (B2)",
     "LINGUISTICA ITALIANA":"Linguistica italiana",
     "NEUROPSICHIATRIA INFANTILE":"Neuropsichiatria infantile",
     "PEDAGOGIA GENERALE":"Pedagogia generale",
     "PEDAGOGIA SOCIALE":"Pedagogia sociale",
     "PEDAGOGIA SOCIALE - LABORATORIO DI PEDAGOGIA SOCIALE":"Lab. Pedagogia sociale",
     "PEDAGOGIA SPERIMENTALE - MOD.1":"Pedagogia sperimentale – Mod. 1",
     "PSICOLOGIA DELL'EDUCAZIONE":"Psicologia dell'educazione",
     "PSICOLOGIA DELL'EDUCAZIONE - LABORATORIO DI PSICOLOGIA DELL'EDUCAZ":"Lab. Psicologia dell'educazione",
     "PSICOLOGIA DELLO SVILUPPO":"Psicologia dello sviluppo",
     "SOCIOLOGIA DELL'EDUCAZIONE":"Sociologia dell'educazione",
     "STORIA CONTEMPORANEA":"Storia contemporanea",
    }
    if s.startswith("TEORIE E METODI"): return "TEORIE"
    return M.get(s, tit(s))

ANNO={
 "Educazione motoria":1,"Pedagogia generale":1,"Psicologia dello sviluppo":1,"Sociologia dell'educazione":1,"Lettorato di lingua inglese di base":1,
 "Biologia generale":2,"Geografia":2,"Linguistica italiana":2,"Neuropsichiatria infantile":2,
 "Didattica della matematica":3,"Grammatica italiana":3,"Lab. Grammatica italiana":3,"Lab. Lingua inglese III":3,"Pedagogia sperimentale – Mod. 1":3,"Lettorato Lab. Inglese III (B1+)":3,
 "Educazione ambientale":4,"Letteratura italiana – Mod. 1":4,"Pedagogia sociale":4,"Lab. Pedagogia sociale":4,"Psicologia dell'educazione":4,"Lab. Psicologia dell'educazione":4,
 "Educazione all'immagine":5,"Lab. Educazione all'immagine":5,"Lab. Lingua inglese V":5,"Storia contemporanea":5,"Lettorato Lab. Inglese V (B2)":5,"Etica professionale":5,"La gestione della classe multietnica e plurilingue":5,
}

def gruppo(mat,doc,wd,h0,h1,day):
    """ritorna (gruppo, nota) — gruppo: 'A-L','M-Z', 'G1'.., None=tutti"""
    k=(wd,h0)
    if mat=="Pedagogia generale":
        return {("Mon",11):"A-L",("Tue",14):"A-L",("Mon",14):"M-Z",("Tue",11):"M-Z"}.get(k)
    if mat=="Sociologia dell'educazione":
        return {("Wed",8):"A-L",("Thu",11):"A-L",("Wed",11):"M-Z",("Thu",8):"M-Z"}.get(k)
    if mat=="Biologia generale":
        return "A-L" if "BUONANNO" in doc.upper() else "M-Z"
    if mat=="Geografia":
        return {("Tue",11):"A-L",("Wed",8):"A-L",("Mon",11):"M-Z",("Tue",8):"M-Z"}.get(k)
    if mat=="Didattica della matematica":
        return {("Wed",11):"A-L",("Thu",14):"A-L",("Wed",8):"M-Z",("Thu",17):"M-Z"}.get(k)
    if mat=="Pedagogia sperimentale – Mod. 1":
        return {("Tue",14):"A-L",("Thu",17):"A-L",("Wed",17):"M-Z",("Tue",17):"M-Z",("Thu",14):"M-Z"}.get(k)
    if mat=="Lab. Lingua inglese III":
        return {("Mon",8):"G1",("Mon",10):"G2",("Mon",12):"G3",("Tue",9):"G4",("Tue",11):"G5"}.get(k)
    if mat=="Lab. Lingua inglese V":
        return {("Wed",11):"G1",("Wed",17):"G2",("Thu",9):"G3",("Thu",11):"G4"}.get(k)
    if mat=="Lab. Pedagogia sociale":
        return {"11-25":"G1","11-26":"G1","12-01":"G2","12-03":"G2"}.get(day[5:])
    if mat=="Lab. Psicologia dell'educazione":
        return {("11-23",14):"G1",("11-30",17):"G1",("12-02",14):"G1",
                ("11-23",17):"G2",("11-30",14):"G2",("12-05",9):"G2",
                ("12-14",14):"G3",("12-09",17):"G3",("12-16",12):"G3",
                ("12-14",17):"G4",("12-09",14):"G4",("12-16",16):"G4"}.get((day[5:],h0))
    return None

events=[]
for k,d in seen.items():
    s=datetime.strptime(k[0],'%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc).astimezone(ROME)
    e=datetime.strptime(k[1],'%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc).astimezone(ROME)
    summ=k[2]; desc=k[3].replace('\\n','\n'); loc=k[4]
    docente=desc.split('\n')[0].strip()
    nota=""
    if 'NOTE:' in desc: nota=desc.split('NOTE:')[1].strip()
    mat=mat_name(summ)
    wd=s.strftime('%a'); h0=s.hour; day=s.strftime('%Y-%m-%d')
    tipo="LEZ"
    if mat.startswith("Lab."): tipo="LAB"
    if mat.startswith("Lettorato"): tipo="LET"
    g=None
    if mat=="TEORIE":
        anno=3
        gia="GIANNANDREA" in docente.upper()
        if (wd,h0) in [("Wed",17),("Thu",11),("Fri",9),("Fri",11)]:
            mat="Teorie e metodi di programmazione e valutazione – Mod. 1" if gia else "Teorie e metodi di programmazione e valutazione – Mod. 2"
        else:
            mat="Lab. Teorie e metodi (Mod. 3)"; tipo="LAB"
            if not gia: g="G4"
            elif (wd,h0)==("Mon",8) or (wd,h0)==("Tue",14): g="G2"
            elif (wd,h0)==("Mon",11) or (wd,h0)==("Tue",17): g="G3"
            elif (wd,h0)==("Mon",17): g="G1"
        if nota and 'M-Z' in nota and g is None: g="M-Z"
    else:
        anno=ANNO.get(mat)
        g=gruppo(mat,docente,wd,h0,e.hour,day)
    aula=loc.split(' - ')[0].strip().replace('  ',' ')
    if 'Bertelli' in loc and aula: aula=aula
    docn=tit(docente) if docente else ""
    docn=docn.replace("O'doherty","O'Doherty")
    if not docn:
        docn={"Psicologia dello sviluppo":"Felici Fabio","Lab. Lingua inglese III":"Bolognesi Elisa","Lab. Psicologia dell'educazione":"Felici Fabio"}.get(mat,"")
    events.append({"d":day,"i":s.strftime('%H:%M'),"f":e.strftime('%H:%M'),"m":mat,"doc":docn,"g":g,"a":aula,"anno":anno,"t":tipo})
events.sort(key=lambda x:(x['d'],x['i'],x['anno'] or 0,x['m']))
print(len(events))
from collections import Counter
print(Counter((x['anno'],x['m'],x['g']) for x in events))
json.dump({"aggiornato":"2026-09-21","semestre":"I semestre a.a. 2026/27","fine":"2026-12-18","eventi":events},open(os.path.join(os.path.dirname(__file__),'..','..','calendario-lezioni.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
