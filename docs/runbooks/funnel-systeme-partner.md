# Runbook — creare il funnel Systeme.io di un partner

Estratto da `CLAUDE.md` l'11/8/2026 (voci del 21-23/4/2026).

**Stato**: procedura ancora **aperta e valida**, ma manuale — gira nel browser loggato
sull'account Systeme del partner, non dal backend. L'unico funnel reale costruito con
questa procedura è quello di Daniele Andolfi (`7121027`).

La distinzione **Duplica vs Condividi** (§ sotto) è la cosa che si sbaglia più spesso:
*Duplica* clona il funnel nell'account `evolutionpro`, *Condividi* lo importa nell'account
del partner. Solo la seconda è quella giusta.

---

## Automazione Funnel Systeme.io (2026-04-21)

### Stack tecnico editor
Systeme.io usa React + TipTap/ProseMirror. I contenteditable della pagina Optin sono accessibili via React fiber tree.

### ⚠️ DISTINZIONE FONDAMENTALE: Duplica vs Condividi

- **Duplica** (⋯ menu) → clona il funnel nello STESSO account Systeme.io (evolutionpro). Utile per varianti interne. NON crea il funnel nell'account del partner.
- **Condividi** (⋯ menu) → genera un link. Quando aperto dall'account del partner, importa il funnel in quell'account. Questo è il meccanismo corretto per i partner.

### Workflow corretto per creare il funnel di un partner
1. systeme.io/dashboard/funnels → ⋯ Template Master → **Condividi** → copia il link
2. Login nell'account Systeme.io del partner
3. Apri il link condivisione nel browser del partner → funnel importato automaticamente
4. Clicca sul funnel → step Optin → Modifica Pagina
5. Esegui script iniezione nella console del browser (getTipTapEditor + setEditorText)
6. Click Salvare — chiama POST /dashboard/editor/api/page/{ID}/save
7. Salva URL nel campo Systeme.io del FunnelBuilder admin

### Funzione helper (incollare nella console dell'editor Systeme.io)
```
function getTipTapEditor(el) {
  let node = el.parentElement;
  for (let i=0;i<5;i++) {
    const key = Object.keys(node).find(k=>k.startsWith('__reactFiber'));
    if (key) { let f=node[key]; for(let j=0;j<30;j++) { if(f?.memoizedProps?.editor?.commands) return f.memoizedProps.editor; f=f?.return; if(!f)break; } }
    node=node.parentElement; if(!node)break;
  } return null;
}
function setEditorText(editor,text){editor.commands.focus();editor.commands.selectAll();editor.commands.insertContent(text);}
const fields = { /* optin_page_fields dal payload JSON di FunnelBuilder */ };
const els = Array.from(document.querySelectorAll('[contenteditable]'));
Object.entries(fields).forEach(([i,t])=>{ const ed=getTipTapEditor(els[+i]); if(ed)setEditorText(ed,t); });
```

### Mappatura indici Optin
0=HEADLINE_PRINCIPALE | 1=SOTTOTITOLO | 2=copyright breve | 3=PARTNER_BIO
4=intro bullet | 5=DOLORE_1 | 6=DOLORE_2 | 7=DOLORE_3 | 8=DOLORE_4
9=footer info | 10=copyright footer

### Card FunnelBuilder aggiunta (2026-04-21)
File: frontend/src/components/admin/FunnelBuilder.jsx
Card 'Funnel Systeme.io' con: URL input (salva in partner_funnel.funnel_systeme_url),
link 'Apri funnel', pulsante 'Copia dati per Claude (JSON)' con optin_page_fields mappati.

### Template Master Systeme.io
ID: 6706257 | URL: evolutionpro.systeme.io/optin-f2485c57
NON modificare il Template Master — usare sempre Duplica.

### Struttura Template Master aggiornata (2026-04-21)
Il Template Master ora include:
- **Urgency bar in cima** con countdown (giorni/ore/minuti/secondi) — componente nativo Systeme.io, NON TipTap
- **Footer con link legali**: Cookie Policy | Privacy Policy | Condizioni di Vendita

### Mappatura indici contenteditable (post-aggiornamento)
| Idx | Contenuto | Campo FunnelBuilder |
|-----|-----------|---------------------|
| 0 | Headline | HEADLINE_PRINCIPALE |
| 1 | Sottotitolo | SOTTOTITOLO |
| 2 | Copyright breve | © {PARTNER_NOME} |
| 3 | Bio trainer | PARTNER_BIO |
| 4 | Intro bullet | generato |
| 5 | Bullet 1 | DOLORE_1 |
| 6 | Bullet 2 | DOLORE_2 |
| 7 | Bullet 3 | DOLORE_3 |
| 8 | Bullet 4 | DOLORE_4 |
| 9 | Footer info | {PARTNER_NOME} + {PARTNER_NICCHIA} + tel |
| 10 | Copyright + link legali | Copyright ANNO © {PARTNER_NOME} + link Cookie/Privacy/Vendita |

I link nel footer (Cookie Policy, Privacy Policy, Condizioni di Vendita) devono avere href reali per ogni partner.

### Daniele Andolfi — funnel TEST creato
Funnel ID: 7114182 | Pagina Optin ID: 40213665
URL: evolutionpro.systeme.io/optin-f2485c57-7d6c3447
Demo completata: copy iniettato e salvato correttamente.
⚠️ Creato con Duplica (non Condividi) — è nell'account evolutionpro, NON nell'account Systeme.io di Daniele.
Va ricreato seguendo il workflow corretto con Condividi + account partner.
