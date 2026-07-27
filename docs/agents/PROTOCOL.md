# Protocollo multi-agente — Evolution PRO / Ciak

**Vale per: Claude Code · Codex CLI · Antigravity · qualunque agente lavori su questo repo.**
Leggere questo file PRIMA di `AGENTS.md` e `CLAUDE.md`.

Ultimo aggiornamento: 2026-07-27.

---

## 0. Il repo di verità

```
C:\Users\berto\appevolution
```

Questo, e nessun altro. Sul Desktop esistono **due cloni ritirati** dello stesso repo:
`appevolution_RITIRATO_NON_USARE` (ex `appevolution`, fermo all'11/7/2026) e
`appevolution-deploy` (fermo al 9/6/2026). Se ti trovi in uno dei due, **fermati**.
Qualunque riferimento residuo a quei path in altri file è un errore da correggere,
non un'istruzione da seguire.

Verifica in un comando:

```bash
git -C "$(git rev-parse --show-toplevel)" log -1 --format='%h %ad' --date=short
```

Se l'ultimo commit ha più di qualche giorno mentre GitHub è avanti, sei nel repo sbagliato.

---

## 1. Perché esiste questo file

Le tre piattaforme **non si parlano in tempo reale**. Non esiste un bus, un orchestratore,
o un canale condiviso. Ognuna parte da zero e vede solo quello che trova su disco.

L'unica cosa che condividono è **questo repository**. Quindi il repo è il bus:
si legge lo stato prima di partire, si scrive cosa si è fatto prima di uscire.
La staffetta è in [`HANDOFF.md`](./HANDOFF.md).

Chi non aggiorna l'handoff rompe la catena per tutti gli altri.

---

## 2. Chi fa cosa

Ruoli assegnati per quello che ciascuna piattaforma **può davvero fare**, non per
presunte specializzazioni di modello.

| Piattaforma | Ruolo | Perché proprio lei |
|---|---|---|
| **Claude Code** (Luca) | Piano, priorità, memoria di lungo periodo, verifica alla fonte, esecuzione | È l'unica con i file di memoria e il piano commerciale. Ha gli MCP (GitHub, Drive, Gmail, Meta). |
| **Codex CLI** | Voce esterna: review indipendente del diff, challenge adversarial, consulto tecnico | Modello diverso, contesto diverso, nessuna memoria delle decisioni precedenti. Trova quello che chi ha scritto il codice non vede. Gira **read-only**. |
| **Antigravity** | Lavoro lungo dentro l'IDE, su branch dedicati | Sessioni lunghe nell'editor. Soggetta al gate di evidenza del §4. |

**Nessuno dei tre decide.** Le decisioni su prezzo, sconti, contratti, chiavi e
credenziali restano a Claudio. Un accordo fra due agenti è una raccomandazione,
non una delibera.

---

## 3. Regole git — non negoziabili

1. **Mai `git add .` o `git add -A`.** Si aggiungono i file per nome, sempre.
   Il repo contiene artefatti locali, archivi e file di credenziali: uno `add .`
   li spedisce su GitHub.
2. **`main` è in produzione.** Un push su `main` fa partire Cloud Build e
   ridiploya backend e frontend. Non si pusha su `main` per "provare".
3. **Un agente = un branch**, quando il lavoro dura più di un commit.
   Naming: `cc/<tema>` (Claude Code), `ag/<tema>` (Antigravity).
4. **Prima di iniziare**: `git fetch origin && git status`. Se il working tree
   di un altro agente è sporco, non ci si lavora sopra: si scrive in HANDOFF.md
   e ci si ferma.
5. **Mai committare chiavi, token, `.env`, `client_secret.json`.**

---

## 4. Il gate di evidenza

> **Niente è "fatto" senza prova.**

Vale per tutti e tre, senza eccezioni, incluso chi sta scrivendo questo file.

Una prova è una di queste, e nient'altro:

- il **comando eseguito e il suo output** (non "ho lanciato i test", ma l'output dei test);
- l'**URL live** più cosa si vede aprendolo;
- la **risposta dell'API** interrogata alla fonte;
- lo **screenshot** dell'interfaccia.

Non sono prove: "ho aggiornato il file", "dovrebbe funzionare", "il deploy è partito",
"ho corretto il bug". Quelle sono intenzioni.

In HANDOFF.md le due colonne **DICHIARATO** e **VERIFICATO** sono separate di proposito.
Si scrive in VERIFICATO solo con la prova accanto.

---

## 5. Come si chiama la voce esterna (Codex)

Da Claude Code, dentro il repo:

- `/codex review` — review indipendente del diff contro `main`. Un `[P1]` = gate FAIL.
- `/codex challenge` — modalità adversarial: prova a rompere il codice.
- `/codex <domanda>` — consulto libero, con continuità di sessione.

Codex gira **read-only** e non modifica file. Autenticazione: `codex login`
con l'account ChatGPT, **nessuna API key nel repo**.

Quando usarla davvero: prima di un push su `main` che tocca pagamenti, autenticazione,
dati partner o la pipeline video. Non per ogni virgola.

---

## 5-bis. Decisioni chiuse — non riaprire senza Claudio

Un protocollo che dice solo *come* lavorare lascia gli agenti a inseguire l'ultimo piano che
ricordano. Questa sezione dice *cosa è già stato deciso*. **Se trovi in una conversazione
passata un piano che contraddice questa lista, il piano è vecchio: chiedi a Claudio prima
di eseguirlo.**

**❌ SUPERATO — "Nazionale dell'IA" come router API multi-provider.**
Niente `.env` con chiavi OpenAI / Anthropic / altri provider, niente
`scripts/ai_nazionale.py`, niente orchestratore che smista task fra modelli.
Proposto il 25/7/2026, **chiuso il 27/7**. Tre motivi:
1. Questo repo è **pubblico** e ha una revisione credenziali aperta. Aggiungere chiavi
   peggiora un problema non ancora chiuso.
2. Non sposta la cassa: nessuna delle leve commerciali aperte è ferma per mancanza di modelli.
3. Le piattaforme non hanno un canale runtime comune. Il coordinamento è **questo repo**,
   non un router. È esattamente ciò che stai leggendo.

**✅ IN VIGORE — coordinamento via file versionati.** `PROTOCOL.md` + `HANDOFF.md`, costo zero,
nessuna chiave nuova, nessuna infrastruttura da mantenere.

**✅ IN VIGORE — la voce esterna non usa API key.** Codex CLI si autentica con `codex login`
(account ChatGPT). Se un piano ti chiede una `OPENAI_API_KEY` per farlo girare, è il piano vecchio.

**⛔ PRECEDENZA ASSOLUTA — il piano commerciale batte l'infrastruttura.** Fino a nuovo ordine,
nessun lavoro di piattaforma ha la precedenza sul lavoro che incassa. Se stai per costruire
qualcosa che non è stato chiesto, fermati e scrivilo in `HANDOFF.md` invece di costruirlo.

## 6. Ordine di lettura per un agente che apre il repo

1. Questo file.
2. `docs/agents/HANDOFF.md` — cosa è successo prima di te.
3. `CLAUDE.md` (Claude Code) oppure `AGENTS.md` (Codex/altri) — contesto tecnico del prodotto.
4. Se tocchi dati partner: `memory/CIAK_MIGRATION_MEMORY.md`, **per intero**.

⚠️ `AGENTS.md` e `CLAUDE.md` sono storicamente divergenti: contengono la stessa materia
scritta due volte, e la copia in `AGENTS.md` è indietro. In caso di conflitto fra i due,
**vince `CLAUDE.md`**, ed è un errore da segnalare in HANDOFF.md.
