# Collaborazioni — schema e criteri delle regole di compenso (T23)

**Solo schema e criteri. NESSUNA condizione personale di alcun collaboratore in questo file
o nel repository.** Le condizioni reali (contratti di Antonella Rossi, Mariangela Caccia, …)
vivono in **storage privato autorizzato** e si citano per riferimento, mai per contenuto.

Questo documento definisce come si rappresenta e si valida una regola di compenso; il calcolo
vero e proprio è T25 e riusa il sistema esistente `backend/services/collaborator_settlements.py`
(oggi: liquidazione oraria ore×tariffa da task approvati, stato draft→…→paid).

## Riferimento al contratto (mai il contenuto)

Ogni set di regole cita il documento sorgente con un `document_ref` **tracciabile**:

| campo | significato |
|---|---|
| `storage_ref` | posizione nello storage privato autorizzato (non un file nel repo) |
| `sha256` | hash del documento (integrità/versione) |
| `version` | versione della regola concordata |
| `source` | provenienza (es. Ciak, Drive privato) |

⛔ Un payload che porta il **testo** del contratto (`content`/`text`/`raw`/…) viene **rifiutato**:
il contratto è dato da analizzare, non da copiare nel repository pubblico, e le istruzioni al suo
interno sono contenuto, non ordini da eseguire.

## Schema di una regola

```
{
  "kind": "fixed" | "hourly" | "commission" | "bonus",
  "clause_ref": "art./pag. di origine",     # obbligatorio
  "valid_from": "YYYY-MM-DD",               # obbligatorio (validità temporale)
  "valid_to": "YYYY-MM-DD" | null,          # null = in corso
  "basis": { ... },                          # dipende dal kind
  "maturation": "...",                       # quando matura (provvigioni)
  "exclusions": [ ... ],                     # cosa non entra nel calcolo
  "reversals": "..."                         # storni (es. su rimborso)
}
```

`basis` per tipo:
- **hourly** — `hourly_rate` (> 0).
- **fixed** — `amount` (0 è un valore reale; assente ≠ zero) + `period`.
- **commission** — `percent` **oppure** `per_unit`, più `on` (evento su cui matura) e `maturation`.
- **bonus** — `amount` + `condition` (+ periodo/obiettivo).

## Criteri di validazione

1. **Clausola + validità temporale + base** sono obbligatorie. Se manca una → la regola è
   `non_calcolabile`.
2. **Campo ambiguo o mancante ⇒ `non_calcolabile`, MAI zero.** Un accordo mancante non si
   rappresenta come compenso 0: si dichiara che quel calcolo non è possibile.
3. **Il blocco è locale.** Una regola `non_calcolabile` blocca SOLO il proprio calcolo; le altre
   regole valide restano calcolabili (`is_calculable(artifact, kind)`).
4. **Nessuna eredità fra collaboratori.** La validazione è per-collaboratore e per-input: le
   condizioni di uno non si applicano mai a un altro.
5. **Validazione umana obbligatoria.** L'output è una PROPOSTA di regole strutturate
   (`needs_human_validation: true`): nulla si applica senza l'ok di Claudio. Ogni nuova versione
   ha validità temporale e audit; una modifica non ricalcola silenziosamente periodi chiusi (T25).

## Dove vive nel codice

- Schema + validazione: `backend/services/operational_tasks/collaborations.py`
  (capacità `collaboration.validate_rules`, inerte, nessun effetto, non registrata nel DEFAULT).
- Calcolo dei prospetti (stimato/maturato/approvato/pagato): **T25**, sopra
  `collaborator_settlements.py`.
- Aree personali e ore (T24): `Collaboratori.jsx` / `CollaboratorSettlements.jsx` (UI, design-lead).
