# Ricetta di costruzione — FUNNEL PARTNER (opt-in + sales che converte)

> **Regola discriminante:** il funnel è **on-brand dal brand kit REALE del partner** e
> scritto **con copy dalle fonti REALI**. Mai inventare dati (prezzo, garanzia,
> testimonianze, ID video, nome offerta). Se un dato manca → **placeholder evidenziato +
> handoff umano**, mai un valore di fantasia.

**Obiettivo:** produrre le pagine del funnel owned del partner (fuori Systeme, deploy
su dominio del partner), on-brand e conversion-first, partendo dai dati già raccolti in
Fase 1 EVO. Systeme resta CRM/email, Stripe l'incasso.
**Metrica nord:** opt-in rate (pagina 1) → play masterclass → conversione all'offerta (pagina 2).
**Pilota di riferimento:** Daniele Andolfi / Metodo Sabai (17/7/2026).

---

## 1. Pre-flight — raccolta materiali (fonti in ORDINE di priorità)
1. **Brand kit + copy Fase 1** → `GET /api/partner-hub/{partner_id}` (ciak.io).
   Espone TUTTO: `logo, primaryColor, accentColor, textColor, bgColor, fontPrimary,
   fontSecondary` **+** `whoYouAre, targetAudience, problem, solution, pitch,
   differentiator, offerName, offerPrice, offerIncludes, offerGuarantee, toneOfVoice,
   keywords, heroPhoto, introVideo, bio, instagram/youtube/website`.
   ⚠️ **NON** usare `/api/brandkit/{id}` (collection legacy `brand_kits`, spesso solo default `#F5C518`).
2. **Analisi Strategica Fase 1** → Google Drive, cartella partner `01 - Documenti/Analisi *.pdf`
   (posizionamento, target reale, struttura offerta/Academy, leve di autorità).
3. **Sito vetrina del partner** → palette, tono, **foto reali**, stile. Il funnel deve stare
   in **equilibrio col sito** (coerenza visiva), non essere un mondo scollegato.
4. **Video** → **apri e VERIFICA ogni URL** (masterclass vs lezioni). I label dei campi Ciak
   NON sono affidabili (trappola reale: la "masterclass video pulito" era la lezione 1).

## 2. Direzione design (brand parametrico)
- **Palette e font dal brand kit reale** del partner. Mai default, mai a caso.
- **Skill `ui-ux-pro-max`** per il benchmark di settore (pattern, stile, struttura landing).
  Regola emersa: **wellness/olistico → niente dark, niente neon** → soft/luminoso/caldo.
  Business/professionisti → premium/dark ammesso. Adatta al settore del partner.
- Coerenza col sito vetrina (§1.3).

## 3. Asset (prepararli prima di comporre)
- **Logo**: rendi lo **sfondo trasparente** (rimozione near-white via PIL) ed **estrai il
  simbolo** dal wordmark; usalo **ingrandito** nell'header.
- **Foto autore**: usa una **foto REALE del partner** (sito o `heroPhoto`), sfondo rimosso e
  raddrizzata. **Mai un volto generato dall'AI** (autenticità = conversione; è persona reale).
- **Copertina masterclass**: miniatura **16:9 brandizzata** (foto frontale del partner +
  titolo forte + logo + badge "Masterclass gratuita"), **non** la thumbnail YouTube grezza.

## 4. Pagina 1 — OPT-IN (goal: visitatore → lead che guarda la masterclass)
Struttura: header(logo) → **hero** (eyebrow · H1 dalla headline reale · sub dal pitch ·
**form nome+email above-the-fold** · social proof) → strip dati → **"cosa scoprirai"** (3 punti)
→ **autore** (foto + bio + autorità reale) → band CTA → **FAQ** → footer legali.
Copy: dal posizionamento reale (§1). CTA unica e ripetuta.

## 5. Pagina 2 — SALES (VSL → offerta)
Struttura: header → **hero + VIDEO masterclass** (poster = copertina brandizzata) →
**problema** (bullet dai `problem` reali) → **soluzione + differenziatore + moduli**
(dall'Analisi Fase 1) → **autore** → **testimonianze** (REALI) → **offerta**
(nome · prezzo pieno + lancio · cosa include dai fatti reali · garanzia) → **FAQ obiezioni**
→ **CTA finale** → footer.

## 6. Regole ferree (anti-invenzione — non negoziabili)
- **Prezzo, garanzia, nome offerta, testimonianze, ID video**: MAI inventati. Se assenti →
  **placeholder evidenziato** (badge rosso "DA DEFINIRE") + **chiedi all'owner**.
- **Testimonianze**: solo REALI del partner. Se il sito non ne ha → sezione **pronta con
  placeholder** + handoff (chiedi 2-3 recensioni reali: nome + testo + foto facoltativa).
- **Brand**: dal brand kit reale, mai default.
- **Ogni video**: aprilo e verifica cosa è prima di usarlo.

## 7. Prompt operativo (da dare all'agente Funnel Factory)
> "Costruisci il funnel owned del partner {id}. Raccogli brand+copy da
> `/api/partner-hub/{id}`, l'Analisi Fase 1 dal Drive e lo stile+foto dal sito vetrina.
> Usa palette e font del **brand kit reale** (mai default); per il settore usa la skill
> ui-ux-pro-max (wellness → no dark). Prepara gli asset: logo trasparente+ingrandito,
> foto reale del partner con sfondo rimosso, copertina masterclass 16:9 brandizzata.
> Costruisci **opt-in** (hero+form, cosa scoprirai, autore, FAQ) e **sales VSL** (video
> masterclass, problema, soluzione+moduli, autore, testimonianze, offerta, garanzia, FAQ,
> CTA) con copy REALE dal posizionamento. Verifica ogni URL video aprendolo. Per prezzo,
> garanzia, nome offerta e testimonianze usa **placeholder evidenziati se mancano** e
> segnalali all'owner — NON inventarli."

## 8. Handoff umano — chiedi SEMPRE all'owner (Claudio) prima del publish
- Prezzo (pieno + eventuale lancio) · garanzia · nome ufficiale offerta
- 2-3 testimonianze reali del partner
- Conferma del video masterclass corretto (verificato)
- Dominio del partner + ok al deploy
- Collegamento **Systeme** (CRM/email) + **Stripe** (checkout)

## 9. QC gate (tutte prima del publish)
- [ ] Colori e font = brand kit reale del partner (non default).
- [ ] Coerenza visiva col sito vetrina.
- [ ] Copy dalle fonti reali; zero testo inventato.
- [ ] Nessun dato di fantasia: prezzo/garanzia/testimonianze/video reali o placeholder segnalati.
- [ ] Video masterclass verificato (è la masterclass, non una lezione).
- [ ] Opt-in: form above-the-fold, una CTA. Sales: offerta chiara + garanzia + CTA unica.
- [ ] Logo nitido (sfondo trasparente), foto reale del partner, copertina brandizzata.
- **Gate umano:** Claudio approva prima del publish e fornisce i dati mancanti (§8).

## 10. Output
Pagine statiche del funnel owned → deploy Vercel su **dominio del partner**.
`index.html` = opt-in · `vendita.html`/`sales.html` = sales · + legali (privacy/cookie/termini).
Collegamento: opt-in → contatto+tag Systeme → email masterclass; sales CTA → Stripe checkout →
tag cliente + onboarding. Nome asset: `funnel_{partner}_v{n}`.
