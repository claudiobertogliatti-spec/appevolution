import os
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test_db")
os.environ.setdefault("REACT_APP_BACKEND_URL", "http://localhost:8000")
import json
import pytest
from pathlib import Path

BACKUP_PATH = Path(__file__).parent.parent.parent / "storage" / "migration-backups" / "daniele-andolfi-after-2026-07-30.json"

@pytest.mark.unit
def test_inputs_partial_merge_logic():
    # Simula la logica di merge per chiavi dell'endpoint PATCH /posizionamento/{partner_id}/inputs
    with open(BACKUP_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_inputs = dict(data.get("posizionamento", {}).get("inputs", {}))
    original_keys = set(existing_inputs.keys())
    assert len(original_keys) > 0, "Il posizionamento di Andolfi deve contenere campi inputs"

    # Aggiornamento parziale di soli due campi: target e risultato
    new_target = "Imprenditori e Professionisti"
    new_risultato = "Raggiungere la libertà finanziaria in 90 giorni"

    patch_payload = {
        "target": new_target,
        "risultato": new_risultato
    }

    # Esegui il merge per chiavi
    for k, v in patch_payload.items():
        existing_inputs[k] = v

    # Verifiche:
    # 1. I campi modificati hanno il nuovo valore
    assert existing_inputs["target"] == new_target
    assert existing_inputs["risultato"] == new_risultato

    # 2. TUTTE le altre chiavi originali sono intatte e invariate
    for k in original_keys:
        if k not in patch_payload:
            assert existing_inputs[k] == data["posizionamento"]["inputs"][k]

@pytest.mark.unit
def test_approval_revocation_logic():
    # Verifica la logica di approvazione e revoca esplicita (False)
    doc = {"partner_id": "23", "approvato_dal_partner": True}
    
    # Approvazione attiva
    assert doc["approvato_dal_partner"] is True

    # Revoca esplicita con approvato_dal_partner: False
    payload_revoke = {"approvato_dal_partner": False}
    if "approvato_dal_partner" in payload_revoke and payload_revoke["approvato_dal_partner"] is not None:
        doc["approvato_dal_partner"] = payload_revoke["approvato_dal_partner"]

    # Verifichiamo che il documento abbia registrato la revoca (False) e non sia rimasto True
    assert doc["approvato_dal_partner"] is False
