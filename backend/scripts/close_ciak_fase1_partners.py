"""
Chiude operativamente la Fase 1 / Esamina per i partner migrati da Drive a Ciak.

La migrazione e' volutamente conservativa:
- scrive solo dati inventariati o campi di gap;
- non inventa anagrafiche, CF, P.IVA, social o asset non verificati;
- lascia Luigi Calafiore fuori dal bulk perche' nuovo partner;
- mantiene una nota distinta per ex partner e standby insoluti.

Uso:
    cd backend
    python -m scripts.close_ciak_fase1_partners          # dry-run
    python -m scripts.close_ciak_fase1_partners --apply  # scrive su Mongo

Env richieste: MONGO_URL o MONGO_ATLAS_URL o MONGODB_URI, DB_NAME.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from services.journey_seed import seed_partner_journey


MIGRATION_SOURCE = "drive_to_ciak_fase1_2026_07_10"
ESAMINA_STEP_IDS = [
    "02-discovery-video",
    "01-contratto",
    "burocrazia",
    "03-brand-kit",
    "la-tua-storia",
    "04-posizionamento",
]
NEXT_STEP_ID = "05-script-masterclass"


def _folder(folder_id: str) -> str:
    return f"https://drive.google.com/drive/folders/{folder_id}" if folder_id else ""


PARTNERS: list[dict[str, Any]] = [
    {
        "name": "Sarah Arensi",
        "aliases": ["Sarah Arensi"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "priority": "prioritario",
        "drive_folder_url": _folder("1XnT13G6w3fzSKcZAjCLuR7v918nhGaBm"),
        "content_status": "parziale_avanzato",
        "materials_present": [
            "contratto e distinta",
            "posizionamenti",
            "call argomenti",
            "descrizioni videocorso",
            "calendario editoriale",
            "email funnel e follow-up",
            "playlist YouTube masterclass + lezioni editate",
        ],
        "materials_missing": [
            "codice fiscale",
            "documento identita fronte/retro",
            "IBAN partner",
            "anagrafica fiscale completa",
            "brand kit definitivo",
            "logo standalone",
            "foto professionali isolate",
            "mappatura playlist masterclass/lezioni",
            "bonus, cover e materiali didattici accessori",
            "checkout e Calendly",
        ],
        "next_action": "Mappare playlist YouTube tra masterclass e lezioni; poi verificare bonus, cover, checkout e Calendly.",
        "owner": "delivery",
        "strategy_30_60_90": "30: mappatura video e materiali mancanti. 60: completamento funnel/checkout. 90: rilancio o ottimizzazione su dati reali.",
        "inputs": {
            "competenza": "Arte contemporanea, performance, creative mentoring e metodo La Matrice Creativa / Galactic Creativity.",
            "target": "Creativi, professionisti, artisti, coach, operatori olistici e persone 30-60 anni con blocco creativo o identitario.",
            "problema_cliente": "Blocco creativo, frustrazione, paura del giudizio e disconnessione dalla propria voce espressiva.",
            "risultato": "Sbloccare la creativita e riportarla in modo concreto nella vita quotidiana e professionale.",
            "differenziazione": "Metodo che unisce pratica artistica, corpo, presenza e mentoring creativo, da rendere piu' concreto nel protocollo Ciak.",
            "esperienza": "Artista contemporanea, performer e creative mentor con oltre 25 anni di ricerca e pratica artistica.",
            "esclusioni": "Non e' un corso tecnico per imparare una singola tecnica artistica e non sostituisce percorsi terapeutici.",
            "contesto_storico": "EstaticArt nasce nel 2019; La Matrice Creativa / Galactic Creativity viene strutturata come percorso nel 2024.",
        },
        "positioning_output": {
            "sintesi_progetto": "Sarah aiuta persone creative e professionisti bloccati a ritrovare una pratica creativa viva e concreta.",
            "target_ideale": "Persone con sensibilita' creativa che hanno gia' provato corsi, tecniche o percorsi interiori senza riuscire a portare continuita' nella propria espressione.",
            "problema_principale": "Il blocco creativo diventa perdita di identita', frustrazione e rinvio continuo.",
            "risultato_promesso": "Ritrovare voce creativa, presenza e una pratica espressiva applicabile alla vita quotidiana.",
            "differenziazione": "La Matrice Creativa lavora sull'espressione artistica come pratica guidata, non come sola ispirazione.",
            "brand_positioning_statement": "Sarah Arensi e' una creative mentor che aiuta persone bloccate a riattivare una pratica creativa concreta. A differenza di percorsi solo motivazionali o solo tecnici, lavora su arte, corpo e presenza. Per il cliente significa tornare a creare con continuita' e direzione.",
            "posizionamento_finale": "Aiuto persone creative bloccate a ritrovare una pratica espressiva concreta anche se hanno paura del giudizio o hanno gia' fallito nel restare costanti.",
        },
        "brand_kit": {
            "status": "parziale_non_validato",
            "visual_direction": "Oro dominante, accenti fucsia/blu, texture pittoriche e luminosita'.",
            "missing": ["logo standalone", "palette ufficiale", "font ufficiali", "foto professionali isolate"],
        },
        "story": {
            "status": "bozza_operativa_da_validare",
            "summary": "Artista contemporanea, performer e creative mentor; oltre 25 anni di ricerca artistica, EstaticArt nel 2019 e La Matrice Creativa nel 2024.",
        },
        "extra": {
            "website": "https://www.saraharensi.com",
            "vat_number": "IT08577240966",
            "youtube_playlist_url": "https://www.youtube.com/playlist?list=PLotgbrUYTzMy3IyL69aecoX7PtdyP0w0X",
        },
    },
    {
        "name": "Marco Lamanna",
        "aliases": ["Marco Lamanna"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "priority": "prioritario",
        "drive_folder_url": _folder("121_nTTax-lctfGakCIEhlSk4VzOdL-vZ"),
        "content_status": "contenuti_presenti",
        "materials_present": ["posizionamento", "script e video masterclass", "template videocorso", "bonus/risorse", "calendario lancio social"],
        "materials_missing": ["validazione ownership materiali Alice/Marco", "funnel/checkout definitivi", "anagrafica fiscale completa se non gia' in contratto"],
        "next_action": "Verificare che i materiali Alice/Marco appartengano al profilo corretto prima della Fase 2.",
    },
    {
        "name": "Andrea Fredi",
        "aliases": ["Andrea Fredi"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "priority": "prioritario",
        "drive_folder_url": _folder("1J4F6pLw5S7I_gyrGaZlyrcX8YZ9Z6GGW"),
        "content_status": "parziale",
        "materials_present": ["script masterclass", "script chiusura", "calendario social lancio TAI", "reel/storie/caroselli e istruzioni calendario"],
        "materials_missing": ["documenti/posizionamento in 01 - Documenti", "videocorso", "funnel/checkout", "anagrafica fiscale completa"],
        "next_action": "Recuperare documenti e videocorso prima della lavorazione Fase 2.",
    },
    {
        "name": "Michele Baggio",
        "aliases": ["Michele Baggio"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1VmUPl4H-oN2b3W15eWQWjwcnQwuA3_YV"),
        "content_status": "parziale_video_grezzi",
        "materials_present": ["cartella WeTransfer con materiali video grezzi", "calendario lancio videocorso", "script masterclass", "workbook/presentazione"],
        "materials_missing": ["contratto/posizionamento in cartella standard", "masterclass finale", "funnel/checkout", "calendario standard popolato"],
        "next_action": "Catalogare i materiali video grezzi e recuperare documenti base.",
    },
    {
        "name": "Mariantonietta Tornello",
        "aliases": ["Mariantonietta Tornello", "Maria Antonietta Tornello"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1MLEpVj857nm0WEC-yguhROsWcmJ83A3R"),
        "content_status": "parziale_avanzato",
        "materials_present": ["contratto", "pagamenti", "posizionamento", "brief/argomenti corso", "video masterclass", "calendario editoriale", "email funnel"],
        "materials_missing": ["videocorso", "versione corretta tra copie storiche", "checkout/funnel definitivo"],
        "next_action": "Consolidare versioni duplicate e verificare stato reale lancio/ottimizzazione.",
    },
    {
        "name": "Daniele Andolfi",
        "aliases": ["Daniele Andolfi"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1KboQVIO1ysJ0PjrCJ-oVtGhF4oU4WP3c"),
        "content_status": "parziale_documentale",
        "materials_present": ["contratto", "CI/CF", "analisi", "CRM/lista contatti", "calendario lancio social Sabai"],
        "materials_missing": ["masterclass in Drive standard", "videocorso", "calendario standard popolato", "funnel/checkout"],
        "next_action": "Collegare lo stato pipeline masterclass e agganciare gli asset di lancio.",
    },
    {
        "name": "Cosimo Filieri",
        "aliases": ["Cosimo Filieri"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "priority": "prioritario",
        "drive_folder_url": _folder("1vzJij7xRNaC5uHoLzckrYGWBtnVB7A2L"),
        "content_status": "parziale_solo_calendario",
        "materials_present": ["calendario editoriale", "istruzioni", "prompt AI", "template risposta commenti", "posizionamento rilevato in sorgenti"],
        "materials_missing": ["documenti in cartella standard", "masterclass", "videocorso", "funnel/checkout"],
        "next_action": "Recuperare documenti, masterclass e videocorso prima di avanzare.",
    },
    {
        "name": "Eva Gugliucciello",
        "aliases": ["Eva Gugliucciello", "Eva Gugliuccello"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1A1OQpSlYBrXmixyM76Pa29AwVVdwKTLc"),
        "content_status": "parziale_avanzato",
        "materials_present": ["posizionamento", "video grezzi videocorso", "calendario lancio", "template videocorso", "script masterclass"],
        "materials_missing": ["masterclass in Drive standard", "asset finali", "funnel/checkout", "stato reale lancio/ottimizzazione"],
        "next_action": "Verificare asset finali e distinguere bozze/copie.",
    },
    {
        "name": "Sara Stella Due",
        "aliases": ["Sara Stella Due", "Sara Due", "Sara Duè"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1Vy0bLW4OqT4-LIvrkTH9Y3O5VTqA-3xn"),
        "content_status": "parziale",
        "materials_present": ["posizionamento", "contratto", "calendario lancio videocorso", "sessione strategica gratuita", "template videocorso"],
        "materials_missing": ["masterclass", "videocorso popolato", "funnel/checkout", "nome canonico da confermare"],
        "next_action": "Uniformare nome in Ciak e recuperare masterclass/video.",
    },
    {
        "name": "Arianna Aceto",
        "aliases": ["Arianna Aceto"],
        "status": "standby_operativo_allineato",
        "category": "standby",
        "drive_folder_url": _folder("1Y0la5fto47RouQ30_s6FJfLNcjTFzvBl"),
        "secondary_drive_folder_url": _folder("1lNpYJNOQThBv494ndyEGGD_7W764Xf80"),
        "content_status": "standby",
        "materials_present": ["contratto", "posizionamento", "call argomenti", "documenti"],
        "materials_missing": ["cartella aggiornata definitiva", "masterclass", "videocorso", "funnel/checkout"],
        "next_action": "Conservare inventario; non riattivare finche' non arriva indicazione operativa.",
    },
    {
        "name": "Federica Arimatea",
        "aliases": ["Federica Arimatea"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1X9TZbgMun7JmhqkUlLkBjn4m0ufb5PFv"),
        "content_status": "parziale_minimo",
        "materials_present": ["posizionamento"],
        "materials_missing": ["masterclass", "videocorso", "calendario editoriale", "funnel/checkout", "anagrafica completa"],
        "next_action": "Recuperare materiali operativi oltre al posizionamento.",
    },
    {
        "name": "Silvia Sedda",
        "aliases": ["Silvia Sedda"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1erUT7jylvKKW0cZ8e2GNOW-bXb_yQpdt"),
        "content_status": "struttura_vuota",
        "materials_present": [],
        "materials_missing": ["tutti i materiali Fase 1 e operativi"],
        "next_action": "Contattare o cercare fonti alternative: la cartella standard risulta vuota.",
    },
    {
        "name": "Daphne Oliveti",
        "aliases": ["Daphne Oliveti", "Dafne Oliveti"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1OApHoGTF4EXE6kJsOzWEp6p9P1NOf-ow"),
        "content_status": "parziale_minimo",
        "materials_present": ["posizionamento"],
        "materials_missing": ["masterclass", "videocorso", "calendario editoriale", "funnel/checkout", "anagrafica completa"],
        "next_action": "Recuperare materiali operativi oltre al posizionamento.",
    },
    {
        "name": "Annamaria Depalma",
        "aliases": ["Annamaria Depalma", "Anna Maria Depalma", "Annamaria De Palma"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1ThOSxxpbIc1HMwfS5KRL2EwRSPPIrMag"),
        "content_status": "parziale_minimo",
        "materials_present": ["posizionamento"],
        "materials_missing": ["masterclass", "videocorso", "calendario editoriale", "funnel/checkout", "anagrafica completa"],
        "next_action": "Recuperare materiali operativi oltre al posizionamento.",
    },
    {
        "name": "Maria Giulia Falcone",
        "aliases": ["Maria Giulia Falcone"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1ZlmIIerhndzvhii7ULdPOhNNCCwnChcw"),
        "content_status": "struttura_vuota",
        "materials_present": [],
        "materials_missing": ["tutti i materiali Fase 1 e operativi"],
        "next_action": "Contattare o cercare fonti alternative: la cartella standard risulta vuota.",
    },
    {
        "name": "Marco Orlandi",
        "aliases": ["Marco Orlandi"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("1UcEPVmohzSQ0AT468PuSX4j8PmRV4EaT"),
        "content_status": "parziale_minimo",
        "materials_present": ["posizionamento"],
        "materials_missing": ["masterclass", "videocorso", "calendario editoriale", "funnel/checkout", "anagrafica completa"],
        "next_action": "Recuperare materiali operativi oltre al posizionamento.",
    },
    {
        "name": "Valter Romani",
        "aliases": ["Valter Romani"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": _folder("13eImAOGh44EPlXUxELybltj-m-tlBAP6"),
        "content_status": "parziale_solo_calendario",
        "materials_present": ["calendario editoriale"],
        "materials_missing": ["documenti", "posizionamento", "masterclass", "videocorso", "funnel/checkout"],
        "next_action": "Recuperare documenti e posizionamento prima di avanzare.",
    },
    {
        "name": "Alfredo Vasi",
        "aliases": ["Alfredo Vasi"],
        "status": "fase1_chiusa_ok_operativo",
        "category": "active",
        "drive_folder_url": "",
        "content_status": "parziale_minimo",
        "materials_present": ["posizionamento"],
        "materials_missing": ["cartella Drive ID da confermare", "masterclass", "videocorso", "calendario editoriale", "funnel/checkout"],
        "next_action": "Confermare cartella Drive e mantenere nome corretto Alfredo Vasi.",
    },
    {
        "name": "Marco Serra",
        "aliases": ["Marco Serra"],
        "status": "archivio_ex_partner_allineato",
        "category": "ex_partner",
        "drive_folder_url": "",
        "content_status": "archivio_documentale_brand",
        "materials_present": ["contratto", "proforma", "distinta", "CI", "posizionamenti", "dati brand", "logo/grafiche/immagini brand"],
        "materials_missing": ["masterclass", "videocorso", "calendario editoriale", "bonus"],
        "next_action": "Tenere in archivio: ex partner, non ha rinnovato.",
    },
    {
        "name": "Loris Bonomi",
        "aliases": ["Loris Bonomi"],
        "status": "archivio_ex_partner_allineato",
        "category": "ex_partner",
        "drive_folder_url": "",
        "content_status": "archivio_parziale",
        "materials_present": ["contratto", "pagamenti", "materiali legali principali", "calendario editoriale"],
        "materials_missing": ["masterclass", "videocorso"],
        "next_action": "Tenere in archivio ex partner; non attivare workflow operativo.",
    },
    {
        "name": "Simone Ricco",
        "aliases": ["Simone Ricco", "Simone Riccò"],
        "status": "standby_insoluto_allineato",
        "category": "standby_insoluto",
        "drive_folder_url": "",
        "content_status": "parziale_documentale",
        "materials_present": ["contratto", "proforma", "email", "documenti legali principali", "audio vocali da classificare"],
        "materials_missing": ["masterclass", "videocorso", "calendario editoriale"],
        "next_action": "Standby per insoluto: non procedere operativamente finche' non viene sbloccato.",
    },
    {
        "name": "Giuseppe Sarno",
        "aliases": ["Giuseppe Sarno"],
        "status": "standby_insoluto_allineato",
        "category": "standby_insoluto",
        "drive_folder_url": "",
        "content_status": "struttura_vuota",
        "materials_present": [],
        "materials_missing": ["tutti i materiali operativi"],
        "next_action": "Standby per insoluto: non procedere operativamente finche' non viene sbloccato.",
    },
    {
        "name": "Alice Conventi",
        "aliases": ["Alice Conventi"],
        "status": "standby_insoluto_allineato",
        "category": "standby_insoluto",
        "drive_folder_url": "",
        "content_status": "standby_parziale",
        "materials_present": ["calendario editoriale"],
        "materials_missing": ["documenti", "masterclass", "videocorso"],
        "next_action": "Standby per insoluto; verificare materiali Alice/Marco Finessi prima di riattivare.",
    },
    {
        "name": "Elena Perniola",
        "aliases": ["Elena Perniola"],
        "status": "standby_insoluto_allineato",
        "category": "standby_insoluto",
        "drive_folder_url": "",
        "content_status": "parziale_documentale",
        "materials_present": ["contratto", "pagamento", "posizionamento"],
        "materials_missing": ["masterclass", "videocorso", "calendario editoriale"],
        "next_action": "Standby per insoluto: non procedere operativamente finche' non viene sbloccata.",
    },
]


def _norm(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
    return re.sub(r"\s+", " ", text)


def _partner_tokens(partner: dict[str, Any]) -> set[str]:
    values = [
        partner.get("name"),
        partner.get("full_name"),
        partner.get("nome"),
        partner.get("display_name"),
        partner.get("email"),
    ]
    return {_norm(v) for v in values if _norm(v)}


def _find_partner(target: dict[str, Any], partners: list[dict[str, Any]]) -> dict[str, Any] | None:
    aliases = {_norm(target["name"]), *{_norm(a) for a in target.get("aliases", [])}}
    for partner in partners:
        tokens = _partner_tokens(partner)
        if aliases & tokens:
            return partner
    for partner in partners:
        tokens = _partner_tokens(partner)
        if any(alias and any(alias in token or token in alias for token in tokens) for alias in aliases):
            return partner
    return None


def _base_update(target: dict[str, Any], now: str) -> dict[str, Any]:
    return {
        "fase1_status": target["status"],
        "ciak_fase1_status": target["status"],
        "ciak_fase1_closed_at": now,
        "ciak_migration_source": MIGRATION_SOURCE,
        "drive_folder_url": target.get("drive_folder_url", ""),
        "secondary_drive_folder_url": target.get("secondary_drive_folder_url", ""),
        "drive_structure_status": "drive_strutturato_base",
        "content_status": target.get("content_status", ""),
        "materials_present": target.get("materials_present", []),
        "materials_missing": target.get("materials_missing", []),
        "next_action": target.get("next_action", ""),
        "owner": target.get("owner", "delivery"),
        "strategy_30_60_90": target.get("strategy_30_60_90", ""),
        "operational_category": target.get("category", "active"),
        "migration_priority": target.get("priority", ""),
        "updated_at": now,
        "last_edited_by": "admin",
    }


def _posizionamento_update(target: dict[str, Any], partner: dict[str, Any], now: str) -> dict[str, Any]:
    base = _base_update(target, now)
    base.update(
        {
            "partner_name": partner.get("name") or target["name"],
            "inputs": target.get("inputs", {}),
            "positioning_output": target.get("positioning_output", {}),
            "brand_kit": target.get("brand_kit", {"status": "non_compilato", "missing": target.get("materials_missing", [])}),
            "storia": target.get("story", {"status": "non_compilata", "summary": ""}),
            "ciak_fase1": {
                "status": target["status"],
                "closed_at": now,
                "source": MIGRATION_SOURCE,
                "rule": "Dati reali inseriti dove presenti; campi mancanti lasciati vuoti e registrati come gap.",
                "materials_present": target.get("materials_present", []),
                "materials_missing": target.get("materials_missing", []),
                "next_action": target.get("next_action", ""),
            },
        }
    )
    if target.get("extra"):
        base["public_data"] = target["extra"]
    return base


async def _apply_partner(db, target: dict[str, Any], partner: dict[str, Any], apply: bool) -> dict[str, Any]:
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    partner_id = str(partner.get("id"))
    base_update = _base_update(target, now)

    if not apply:
        return {"partner_id": partner_id, "name": partner.get("name"), "would_update": True}

    await seed_partner_journey(db, partner_id, start_step_number=7)

    await db.partner_posizionamento.update_one(
        {"partner_id": partner_id},
        {
            "$set": _posizionamento_update(target, partner, now),
            "$setOnInsert": {"partner_id": partner_id, "created_at": now},
        },
        upsert=True,
    )

    partner_update = {
        **base_update,
        "fase1_migration_completed_at": now,
        "ciak_protocol_version": "fase1_esamina_2026_07",
        "migration_notes": target.get("next_action", ""),
    }
    if target.get("drive_folder_url"):
        partner_update["drive_folder_url"] = target["drive_folder_url"]
    if target.get("category") == "active":
        current = partner.get("journey_current_step")
        if not current or current in ESAMINA_STEP_IDS:
            partner_update["journey_current_step"] = NEXT_STEP_ID

    await db.partners.update_one({"id": partner_id}, {"$set": partner_update})

    step_payload = {
        "source": MIGRATION_SOURCE,
        "status": target["status"],
        "content_status": target.get("content_status", ""),
        "materials_present": target.get("materials_present", []),
        "materials_missing": target.get("materials_missing", []),
        "next_action": target.get("next_action", ""),
        "drive_folder_url": target.get("drive_folder_url", ""),
        "closed_at": now,
    }

    for step_id in ESAMINA_STEP_IDS:
        await db.partner_journey_steps.update_one(
            {"partner_id": partner_id, "step_id": step_id},
            {
                "$set": {
                    "status": "done",
                    "started_at": now_dt,
                    "completed_at": now_dt,
                    "updated_at": now_dt,
                    "data.ciak_fase1_migration": step_payload,
                }
            },
        )

    if target.get("category") == "active":
        await db.partner_journey_steps.update_one(
            {"partner_id": partner_id, "step_id": NEXT_STEP_ID, "status": {"$ne": "done"}},
            {
                "$set": {
                    "status": "in_progress",
                    "started_at": now_dt,
                    "updated_at": now_dt,
                    "data.previous_phase": "esamina_chiusa_operativamente",
                }
            },
        )

    return {"partner_id": partner_id, "name": partner.get("name"), "updated": True}


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="esegue le scritture; default dry-run")
    args = parser.parse_args()

    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGO_ATLAS_URL") or os.environ.get("MONGODB_URI")
    db_name = os.environ.get("DB_NAME", "evolution_pro")
    if not mongo_url:
        print("ERROR: MONGO_URL/MONGO_ATLAS_URL/MONGODB_URI non configurata", file=sys.stderr)
        return 2

    mode = "APPLY" if args.apply else "DRY-RUN"
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    all_partners = await db.partners.find({}, {"_id": 0, "password": 0}).to_list(length=1000)
    print(f"=== Close Ciak Fase 1 partner [{mode}] su DB '{db_name}' ===")
    print(f"Partner in DB: {len(all_partners)} | target migrazione: {len(PARTNERS)}")

    matched = []
    missing = []
    for target in PARTNERS:
        partner = _find_partner(target, all_partners)
        if not partner:
            missing.append(target["name"])
            print(f"  ! non trovato: {target['name']}")
            continue
        result = await _apply_partner(db, target, partner, args.apply)
        matched.append(result)
        action = "aggiornato" if args.apply else "verrebbe aggiornato"
        print(f"  + {action}: {partner.get('name')} [{partner.get('id')}] -> {target['status']}")

    print(f"\n[{mode}] completato: match={len(matched)} | non trovati={len(missing)}")
    if missing:
        print("Non trovati:", ", ".join(missing))
    if not args.apply:
        print("Nessuna scrittura eseguita. Rilancia con --apply per applicare.")
    client.close()
    return 0 if matched else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
