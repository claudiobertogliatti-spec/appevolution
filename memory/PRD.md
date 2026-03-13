# Evolution PRO OS - Product Requirements Document

## FLUSSO CLIENTE AGGIORNATO

```
/analisi-strategica (Registrazione)
    ↓
/questionario (7 Domande)
    ↓
/analisi-attivazione (Pagamento €67)
    ↓
[Stripe Checkout]
    ↓
/analisi-in-preparazione
    ↓
[Admin genera analisi AI - NON VISIBILE AL CLIENTE]
    ↓
Call con Claudio (presentazione analisi)
    ↓
Proposta partnership
```

---

## REGOLA FONDAMENTALE ⚠️

**L'analisi generata dall'admin NON è visibile al cliente.**

Il cliente vede solo:
- "Analisi Strategica in preparazione"
- Pulsante per prenotare la call

L'analisi viene presentata DURANTE la call strategica.
Dopo la call, l'admin può eventualmente condividere il PDF.

---

## STATI CLIENTE (Dashboard)

| Stato | Condizione | Cosa vede il cliente |
|-------|------------|---------------------|
| 1 | questionario_compilato=false | "Benvenuto" + CTA Questionario |
| 2 | questionario_compilato=true, pagamento=false | "Progetto ricevuto" + CTA Pagamento |
| 3 | pagamento_analisi=true | "Analisi in preparazione" + Prenota Call |

**NOTA:** NON esiste più uno stato "Analisi pronta" per il cliente.
L'analisi resta SOLO nell'admin.

---

## PANNELLO ADMIN

### Flusso Admin
1. Visualizza lista clienti pagati
2. Apre scheda cliente
3. Genera Analisi Strategica (AI)
4. Visualizza punteggio + raccomandazione
5. Salva analisi
6. Scarica PDF (per presentare in call)
7. Aggiorna stato call

### Accesso Analisi
- L'analisi è visibile SOLO nell'admin
- Il PDF viene scaricato dall'admin
- Il PDF viene presentato durante la call
- Dopo la call, l'admin decide se condividere il PDF

---

## CREDENZIALI

| Tipo | Email | Password |
|------|-------|----------|
| Admin | claudio.bertogliatti@gmail.com | Evoluzione74 |
| Cliente test | att2_1773352332@test.com | TestCliente123 |

---

## CHANGELOG

### 13 Mar 2026 - Aggiornamento Flusso
- ✅ Rimosso stato "Analisi pronta" dalla dashboard cliente
- ✅ L'analisi è ora visibile SOLO all'admin
- ✅ Il cliente vede sempre "Analisi in preparazione" dopo il pagamento
- ✅ Aggiunto pulsante "Prenota Call" nella pagina analisi in preparazione
- ✅ L'analisi sarà presentata durante la call strategica

### 13 Mar 2026 - Prompt AI
- ✅ Struttura documento professionale (1200-1800 parole)
- ✅ Punteggio fattibilità (1-10)
- ✅ Raccomandazione finale

---

## PROJECT HEALTH
- **Backend:** ✅ Funzionante
- **Frontend:** ✅ Funzionante  
- **AI (Claude):** ✅ Funzionante
- **PDF:** ✅ Funzionante
