"""
routers/onboarding.py
Gestisce l'onboarding dei nuovi partner: profilo, contratto, pagamento, documenti
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from pathlib import Path
import aiofiles
import os
import json
import subprocess

router = APIRouter(prefix="/api/partner", tags=["onboarding"])

# Database reference (set from server.py)
db = None

def set_db(database):
    global db
    db = database

# Helper function to build partner query (handles both ObjectId and string IDs)
def build_partner_query(partner_id: str):
    """Costruisce la query giusta indipendentemente dal formato dell'id."""
    try:
        return {"_id": ObjectId(partner_id)}
    except (InvalidId, TypeError):
        # Prova come stringa nel campo 'id'
        return {"$or": [{"id": partner_id}, {"id": str(partner_id)}]}

async def find_partner(partner_id: str):
    """Helper to find partner with either ObjectId or string ID."""
    # First try with ObjectId
    try:
        partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
        if partner:
            return partner
    except (InvalidId, TypeError):
        pass
    
    # Fallback to string ID field
    partner = await db.partners.find_one({"id": partner_id})
    return partner

async def update_partner(partner_id: str, update_data: dict):
    """Helper to update partner with either ObjectId or string ID."""
    # First try with ObjectId
    try:
        result = await db.partners.update_one({"_id": ObjectId(partner_id)}, update_data)
        if result.matched_count > 0:
            return result
    except (InvalidId, TypeError):
        pass
    
    # Fallback to string ID field
    result = await db.partners.update_one({"id": partner_id}, update_data)
    return result

# Directories
CONTRATTI_DIR = Path("/app/backend/static/contratti")
DOCUMENTI_DIR = Path("/app/backend/static/documenti")
CONTRATTI_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTI_DIR.mkdir(parents=True, exist_ok=True)

# Payment info
IBAN = "LT94 3250 0974 4929 5781"
BIC = "REVOLT21"
BANK = "Revolut Bank UAB"
AMOUNT = "€2.790,00"
PAYMENT_LINK = os.environ.get("PAYMENT_LINK_PARTNERSHIP", "https://pay.evolution-pro.it/partnership")

# ============================================================================
# MODELS
# ============================================================================

class ProfiloDati(BaseModel):
    nome: Optional[str] = ""
    cognome: Optional[str] = ""
    azienda: Optional[str] = ""
    indirizzo: Optional[str] = ""
    citta: Optional[str] = ""
    cap: Optional[str] = ""
    prov: Optional[str] = ""
    codice_fiscale: Optional[str] = ""
    partita_iva: Optional[str] = ""
    email: Optional[str] = ""
    pec: Optional[str] = ""
    iban: Optional[str] = ""

class ProfiloRequest(BaseModel):
    """Accetta sia {dati: {...}} che i campi direttamente"""
    dati: Optional[ProfiloDati] = None
    # Campi diretti (fallback)
    nome: Optional[str] = None
    cognome: Optional[str] = None
    azienda: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    prov: Optional[str] = None
    codice_fiscale: Optional[str] = None
    partita_iva: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    iban: Optional[str] = None

class ConfermaPagamento(BaseModel):
    metodo: str  # "bonifico" | "online"

class ApprovaStep(BaseModel):
    step: str  # "contratto" | "documenti" | "distinta"
    approvato: bool
    note: Optional[str] = ""

# ============================================================================
# STEP 1: PROFILO + GENERA CONTRATTO
# ============================================================================

@router.post("/{partner_id}/profilo")
async def salva_profilo(partner_id: str, body: ProfiloRequest):
    """Salva i dati anagrafici e genera il contratto precompilato."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Estrai i dati dal body - accetta sia {"dati":{...}} che {...} direttamente
        if body.dati:
            dati_dict = body.dati.dict()
        else:
            # Campi diretti nel body
            dati_dict = {
                "nome": body.nome or "",
                "cognome": body.cognome or "",
                "azienda": body.azienda or "",
                "indirizzo": body.indirizzo or "",
                "citta": body.citta or "",
                "cap": body.cap or "",
                "prov": body.prov or "",
                "codice_fiscale": body.codice_fiscale or "",
                "partita_iva": body.partita_iva or "",
                "email": body.email or "",
                "pec": body.pec or "",
                "iban": body.iban or "",
            }
        
        nome = dati_dict.get("nome", "Partner")
        cognome = dati_dict.get("cognome", "")
        
        # Genera il contratto precompilato
        nome_file = f"Contratto_{nome}_{cognome}_{datetime.now().strftime('%Y%m%d')}.docx"
        output_path = str(CONTRATTI_DIR / nome_file)
        
        # Chiama genera_contratto.py
        script_path = Path("/app/backend/genera_contratto.py")
        dati_dict["data_firma"] = datetime.now().strftime("%d/%m/%Y")
        
        result = subprocess.run(
            ["python3", str(script_path), json.dumps(dati_dict), output_path],
            capture_output=True, text=True, timeout=30
        )
        
        # Se il generatore non esiste o fallisce, crea un placeholder
        if result.returncode != 0:
            # Fallback: crea un file placeholder
            import shutil
            template_path = Path("/app/backend/contratto_template_unpacked")
            if template_path.exists():
                # Crea un DOCX semplice copiando il template
                pass
            docx_url = None
        else:
            docx_url = f"/static/contratti/{nome_file}"
        
        # Aggiorna il partner in MongoDB
        await update_partner(partner_id, {"$set": {
                "onboarding.step_corrente": 2,
                "onboarding.profilo.compilato": True,
                "onboarding.profilo.dati": dati_dict,
                "onboarding.profilo.compilato_at": datetime.now(timezone.utc).isoformat(),
                "onboarding.contratto.docx_generato_url": docx_url,
                # Aggiorna anche i campi principali
                "nome": dati_dict.get("nome", ""),
                "cognome": dati_dict.get("cognome", ""),
                "email": dati_dict.get("email", ""),
                "anagrafica": dati_dict,
            }})
        
        return {"success": True, "docx_url": docx_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# STEP 2a: DOWNLOAD CONTRATTO
# ============================================================================

@router.get("/{partner_id}/scarica-contratto")
async def scarica_contratto(partner_id: str):
    """Download del contratto precompilato."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        partner = await find_partner(partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="Partner non trovato")
        
        docx_url = partner.get("onboarding", {}).get("contratto", {}).get("docx_generato_url")
        if not docx_url:
            raise HTTPException(status_code=404, detail="Contratto non ancora generato")
        
        file_path = Path("/app/backend") / docx_url.lstrip("/")
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File contratto non trovato")
        
        # Registra il download
        await update_partner(partner_id, {"$set": {
                "onboarding.contratto.scaricato": True,
                "onboarding.contratto.scaricato_at": datetime.now(timezone.utc).isoformat()
            }})
        
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# STEP 2b: UPLOAD CONTRATTO FIRMATO
# ============================================================================

@router.post("/{partner_id}/upload-contratto")
async def upload_contratto_firmato(partner_id: str, file: UploadFile = File(...)):
    """Upload del contratto firmato."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        partner_dir = DOCUMENTI_DIR / partner_id
        partner_dir.mkdir(exist_ok=True)
        
        ext = Path(file.filename).suffix.lower() or ".pdf"
        file_path = partner_dir / f"contratto_firmato{ext}"
        
        async with aiofiles.open(str(file_path), 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        file_url = f"/static/documenti/{partner_id}/contratto_firmato{ext}"
        
        await update_partner(partner_id, {"$set": {
                "onboarding.step_corrente": 3,
                "onboarding.contratto.firmato_url": file_url,
                "onboarding.contratto.firmato_at": datetime.now(timezone.utc).isoformat(),
                "onboarding.contratto.approvato": None,
            }})
        
        return {"success": True, "url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# STEP 3: CONFERMA PAGAMENTO
# ============================================================================

@router.post("/{partner_id}/conferma-pagamento")
async def conferma_pagamento(partner_id: str, body: ConfermaPagamento):
    """Il partner dichiara di aver effettuato il pagamento."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        await update_partner(partner_id, {"$set": {
                "onboarding.step_corrente": 4,
                "onboarding.pagamento.metodo": body.metodo,
                "onboarding.pagamento.confermato": True,
                "onboarding.pagamento.confermato_at": datetime.now(timezone.utc).isoformat(),
            }})
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# STEP 4: UPLOAD DOCUMENTI IDENTITÀ
# ============================================================================

@router.post("/{partner_id}/upload-documenti")
async def upload_documenti(
    partner_id: str,
    ci_fronte: UploadFile = File(...),
    ci_retro: UploadFile = File(...),
    codice_fiscale: UploadFile = File(...)
):
    """Upload dei documenti d'identità."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        partner_dir = DOCUMENTI_DIR / partner_id
        partner_dir.mkdir(exist_ok=True)
        
        urls = {}
        for nome_file, upload in [
            ("ci_fronte", ci_fronte),
            ("ci_retro", ci_retro),
            ("codice_fiscale", codice_fiscale)
        ]:
            ext = Path(upload.filename).suffix.lower() or ".jpg"
            path = partner_dir / f"{nome_file}{ext}"
            async with aiofiles.open(str(path), 'wb') as f:
                await f.write(await upload.read())
            urls[nome_file] = f"/static/documenti/{partner_id}/{nome_file}{ext}"
        
        await update_partner(partner_id, {"$set": {
                "onboarding.step_corrente": 5,
                "onboarding.documenti.ci_fronte_url": urls["ci_fronte"],
                "onboarding.documenti.ci_retro_url": urls["ci_retro"],
                "onboarding.documenti.codice_fiscale_url": urls["codice_fiscale"],
                "onboarding.documenti.caricati_at": datetime.now(timezone.utc).isoformat(),
                "onboarding.documenti.approvati": None,
            }})
        
        return {"success": True, "urls": urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# STEP 5: UPLOAD DISTINTA PAGAMENTO
# ============================================================================

@router.post("/{partner_id}/upload-distinta")
async def upload_distinta(partner_id: str, file: UploadFile = File(...)):
    """Upload della distinta di pagamento."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        partner_dir = DOCUMENTI_DIR / partner_id
        partner_dir.mkdir(exist_ok=True)
        
        ext = Path(file.filename).suffix.lower() or ".pdf"
        file_path = partner_dir / f"distinta_pagamento{ext}"
        
        async with aiofiles.open(str(file_path), 'wb') as f:
            await f.write(await file.read())
        
        url = f"/static/documenti/{partner_id}/distinta_pagamento{ext}"
        
        await update_partner(partner_id, {"$set": {
                "onboarding.distinta.url": url,
                "onboarding.distinta.caricata_at": datetime.now(timezone.utc).isoformat(),
                "onboarding.distinta.approvata": None,
                "onboarding.step_corrente": 5,
                "stato": "In revisione",
            }})
        
        return {"success": True, "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# GET ONBOARDING STATUS
# ============================================================================

@router.get("/{partner_id}/onboarding")
async def get_onboarding(partner_id: str):
    """Carica lo stato dell'onboarding per il partner."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        partner = await find_partner(partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="Partner non trovato")
        
        onb = partner.get("onboarding", {})
        
        # URL base per costruire link completi
        base = os.environ.get("REACT_APP_BACKEND_URL", "https://app.evolution-pro.it")
        def full_url(u):
            return f"{base}/api{u}" if u else None
        
        return {
            "step_corrente": onb.get("step_corrente", 1),
            "completato": onb.get("completato", False),
            "profilo": onb.get("profilo", {}),
            "contratto": {
                **onb.get("contratto", {}),
                "docx_url_download": f"/api/partner/{partner_id}/scarica-contratto",
                "firmato_url_full": full_url(onb.get("contratto", {}).get("firmato_url"))
            },
            "pagamento": {
                **onb.get("pagamento", {}),
                "iban": IBAN,
                "bic": BIC,
                "banca": BANK,
                "importo": AMOUNT,
                "payment_link": PAYMENT_LINK
            },
            "documenti": {
                **onb.get("documenti", {}),
                "ci_fronte_full": full_url(onb.get("documenti", {}).get("ci_fronte_url")),
                "ci_retro_full": full_url(onb.get("documenti", {}).get("ci_retro_url")),
                "cf_full": full_url(onb.get("documenti", {}).get("codice_fiscale_url")),
            },
            "distinta": {
                **onb.get("distinta", {}),
                "url_full": full_url(onb.get("distinta", {}).get("url"))
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ADMIN: APPROVA/RIFIUTA STEP
# ============================================================================

@router.post("/{partner_id}/approva")
async def approva_step(partner_id: str, body: ApprovaStep):
    """Admin approva o rifiuta uno step dell'onboarding."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        step = body.step
        approvato = body.approvato
        note = body.note or ""
        
        valid_steps = {"contratto", "documenti", "distinta"}
        if step not in valid_steps:
            raise HTTPException(status_code=400, detail="Step non valido")
        
        field_prefix = f"onboarding.{step}"
        
        # Per documenti usa "approvati", per altri usa "approvato/a"
        if step == "documenti":
            approvato_field = "approvati"
            approvato_at_field = "approvati_at"
        elif step == "distinta":
            approvato_field = "approvata"
            approvato_at_field = "approvata_at"
        else:
            approvato_field = "approvato"
            approvato_at_field = "approvato_at"
        
        await update_partner(partner_id, {"$set": {
                f"{field_prefix}.{approvato_field}": approvato,
                f"{field_prefix}.{approvato_at_field}": datetime.now(timezone.utc).isoformat(),
                f"{field_prefix}.note_admin": note,
            }})
        
        # Controlla se tutti e 3 gli step sono approvati
        partner = await find_partner(partner_id)
        onb = partner.get("onboarding", {})
        
        tutti_approvati = (
            onb.get("contratto", {}).get("approvato") is True and
            onb.get("documenti", {}).get("approvati") is True and
            onb.get("distinta", {}).get("approvata") is True
        )
        
        if tutti_approvati:
            # Sblocca il percorso: avanza F1 → F2
            await update_partner(partner_id, {"$set": {
                    "onboarding.completato": True,
                    "onboarding.completato_at": datetime.now(timezone.utc).isoformat(),
                    "phase": "F2",
                    "stato": "OK",
                }})
        
        return {
            "success": True,
            "tutti_approvati": tutti_approvati,
            "avanzato_a_F2": tutti_approvati
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# GET INFO PAGAMENTO (per mostrare IBAN ecc.)
# ============================================================================

@router.get("/payment-info")
async def get_payment_info():
    """Restituisce le info di pagamento per il frontend."""
    return {
        "iban": IBAN,
        "bic": BIC,
        "banca": BANK,
        "importo": AMOUNT,
        "payment_link": PAYMENT_LINK,
        "intestatario": "Evolution PRO LLC"
    }
