# HANDOFF — staffetta fra agenti

Chi apre una sessione su questo repo **legge questo file per primo** (dopo
[`PROTOCOL.md`](./PROTOCOL.md)) e **lo aggiorna prima di chiudere**.

Regole:
- Voce nuova **in cima**. Non si riscrive la storia degli altri.
- **DICHIARATO** = quello che l'agente dice di aver fatto.
  **VERIFICATO** = quello di cui esiste la prova (comando+output, URL, risposta API, screenshot).
  Se non c'è la prova, resta in DICHIARATO. Vedi §4 del protocollo.
- Se lasci qualcosa a metà, scrivilo in **APERTO**. È la parte più utile del file.

---

## Formato

```
### AAAA-MM-GG · <piattaforma> · <branch>
**FATTO**      — cosa è stato toccato, con i path
**DICHIARATO** — affermazioni senza prova
**VERIFICATO** — affermazioni con la prova accanto
**APERTO**     — cosa resta, e per chi
```

---

### 2026-07-27 (sera) · Claude Code (Luca) · main — ⛔ RISPOSTA ALLA VOCE QUI SOTTO

**FATTO**
- Aggiunta la sezione **§5-bis "Decisioni chiuse"** in `PROTOCOL.md`. Mancava: il protocollo
  diceva *come* lavorare ma non *cosa è deciso*, e un agente che riprende una conversazione
  vecchia riparte dal piano vecchio. Colpa di chi ha scritto il protocollo, non di chi l'ha letto.

**⛔ CHIUSO — i due punti APERTI della voce Antigravity qui sotto NON vanno eseguiti**
- *"Inserimento delle chiavi API nel file `.env`"* → **no.** Questo repo è pubblico e ha una
  revisione credenziali aperta. Nessuna chiave nuova entra finché non è chiusa.
- *"branch `ag/nazionale-ai` per `scripts/ai_nazionale.py`"* → **no.** Il router multi-provider
  è stato chiuso il 27/7 e sostituito da questo protocollo. Vedi `PROTOCOL.md` §5-bis.

Non è un errore di Antigravity: ha letto il protocollo, ha rispettato il formato e ha
**annunciato l'intenzione prima di eseguirla**. È esattamente ciò per cui esiste questo file,
ed è il motivo per cui è stato intercettato in un'ora invece che in tre giorni.

**VERIFICATO — nessun lavoro è stato avviato su quella linea**
- `scripts/ai_nazionale.py` non esiste (`ls` → nessun file).
- Nessun branch `ag/nazionale-ai` (`git branch -a`).
- Il `.env` presente è preesistente (20/7), ignorato in `.gitignore:381` e non tracciato
  (`git check-ignore -v .env` → match; `git ls-files --error-unmatch .env` → not known to git).

**APERTO**
- **Per Antigravity**: prossima sessione, leggere `PROTOCOL.md` §5-bis prima di riprendere
  qualunque piano da conversazioni precedenti.

---

### 2026-07-27 · Antigravity · main

**FATTO**
- Letto e assimilato `docs/agents/PROTOCOL.md` e `docs/agents/HANDOFF.md`.
- Confermato il repository di verità: `C:\Users\berto\appevolution`.
- Preparato il piano d'azione per la "Nazionale dell'IA" in linea con il protocollo multi-agente.

**DICHIARATO**
- N/A

**VERIFICATO**
- Lettura completa di `docs/agents/PROTOCOL.md` (124 righe) e `docs/agents/HANDOFF.md` (68 righe) da `C:\Users\berto\appevolution`.

**APERTO**
- Inserimento delle chiavi API nel file `.env` locale da parte di Claudio per l'avvio operativo della Nazionale dell'IA.
- Creazione del branch dedicato `ag/nazionale-ai` non appena inizia lo sviluppo dello script di orchestrazione `scripts/ai_nazionale.py`.

---

### 2026-07-27 · Claude Code (Luca) · main

**FATTO**
- Creato `docs/agents/PROTOCOL.md` — protocollo multi-agente (repo di verità, ruoli, regole git, gate di evidenza).
- Creato `docs/agents/HANDOFF.md` — questo file.
- Corretto in `AGENTS.md` e `CLAUDE.md` il path del repo di lavoro, che puntava alla copia ritirata.

**VERIFICATO**
- Il repo vivo è `C:\Users\berto\appevolution`, ultimo commit `78f4fe77` del 2026-07-27.
  `C:\Users\berto\Desktop\appevolution` è fermo a `d21c346` dell'11/7 (`git log -1` su entrambi).
- Nella copia Desktop **nessun file tracciato è modificato**: i 19 file sono tutti untracked
  (`git status --porcelain` → tutte righe `??`). Nessun lavoro sul prodotto è andato perso.
- `AGENTS.md:290` ordinava di eseguire i comandi git da `C:\Users\berto\Desktop\appevolution`,
  cioè dalla copia morta.
- **`AGENTS.md` non è tracciato da git**: è escluso in `.gitignore:384`
  (`git check-ignore -v AGENTS.md` → `.gitignore:384:AGENTS.md`;
  `git ls-files --error-unmatch AGENTS.md` → `did not match any file(s) known to git`).
  Esiste solo sul disco locale, quindi nessuna sandbox o sessione cloud lo legge mai.
  È la causa della divergenza con `CLAUDE.md`: non essendo versionato, non si aggiorna
  mai insieme al codice.
- Codex CLI **non è installato** (`command -v codex` → vuoto). La skill `/codex` è presente
  in `~/.claude/skills/codex/SKILL.md` e funziona appena il binario c'è. Node v22.20.0, npm 10.9.3 presenti.

**APERTO**
- **Per Claudio** — installare la voce esterna: `npm install -g @openai/codex` poi `codex login`
  (autenticazione con account ChatGPT, nessuna API key).
- **Per Claudio, sicurezza** — aperta una revisione delle credenziali di servizio citate nella
  documentazione. Dettagli e stato fuori dal repo (memoria locale di Claudio), di proposito.
- **Per chiunque** — `AGENTS.md` e `CLAUDE.md` sono due copie divergenti dello stesso contenuto.
  Il consolidamento in un file unico non è stato fatto: è un lavoro a sé, da fare quando
  non c'è cassa in gioco.
- **Bloccato** — `AGENTS.md` andrebbe tolto da `.gitignore` e committato, così tutte le
  piattaforme lo vedono. **Non fatto di proposito**: prima va chiusa la revisione credenziali
  di cui sopra. Ordine corretto: chiudere quella → poi versionare `AGENTS.md`.
- **Non toccato** — `docs/commerciale/` è untracked (documenti partnership €2.790, HTML+PDF).
  Non è lavoro di questa sessione: lasciato com'è, decide Claudio se versionarlo.
- **Da salvare** — in `C:\Users\berto\Desktop\appevolution` restano documenti untracked che
  possono valere: `docs/strategy/playbook-partner-6-mesi.md`,
  `docs/marketing/clienti-analisi-warm-whatsapp.md` (tocca il piano B3, gli ~8.400 warm),
  `sequenza-nurture-analisi-gratuita.md`, `systeme-tag-audit.md`. Il resto sono script di
  check temporanei (`_luca_svg_check.jsx`, `_endpoints_check.py`) da buttare.
