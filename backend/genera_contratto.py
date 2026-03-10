"""
genera_contratto.py
Genera contratto precompilato con i dati del partner.
Usa il file XML unpacked (runs già mergiati) come template.
Uso: python3 genera_contratto.py '<json_dati>' '/path/output.docx'
"""
import sys, json, shutil, os, subprocess
from datetime import datetime
from pathlib import Path

SCRIPTS_DIR  = Path("/mnt/skills/public/docx/scripts/office")
UNPACKED_TPL = Path("/app/backend/contratto_template_unpacked")  # in prod
OUTPUT_DIR   = Path("/app/backend/static/contratti")

# In sviluppo locale (per test):
if not UNPACKED_TPL.exists():
    UNPACKED_TPL = Path("/home/claude/contratto_unpacked")


def genera_contratto(dati: dict, output_path: str) -> str:
    import tempfile

    nome      = dati.get("nome", "")
    cognome   = dati.get("cognome", "")
    azienda   = dati.get("azienda", "—")
    indirizzo = dati.get("indirizzo", "")
    citta     = dati.get("citta", "")
    cap       = dati.get("cap", "")
    prov      = dati.get("prov", "")
    cf        = dati.get("codice_fiscale", "")
    piva      = dati.get("partita_iva", "—")
    email     = dati.get("email", "")
    pec       = dati.get("pec", "—")
    iban      = dati.get("iban", "")
    data_firma = dati.get("data_firma", datetime.now().strftime("%d/%m/%Y"))

    # Copia la directory unpacked in una tmp per questo contratto
    tmp_dir = tempfile.mkdtemp(prefix="contratto_")
    shutil.copytree(str(UNPACKED_TPL), tmp_dir, dirs_exist_ok=True)

    doc_path = os.path.join(tmp_dir, "word", "document.xml")
    with open(doc_path, 'r', encoding='utf-8') as f:
        xml = f.read()

    # ── 1. ANAGRAFICA ─────────────────────────────────────────────────────────
    old_anagrafica = (
        "NOME ____________________________ COGNOME ___________________________ "
        "AZIENDA __________________________ INDIRIZZO _________________________________ "
        "CITTA&#x2019; ________________________ CAP ______________ PROV. __________ "
        "C. F. __________________________________________________ "
        "P.IVA ___________________________________________________ "
        "EMAIL ________________________________________________ "
        "PEC ___________________________________________________"
    )
    new_anagrafica = (
        f"NOME {nome}   COGNOME {cognome}   "
        f"AZIENDA {azienda}   INDIRIZZO {indirizzo}   "
        f"CITT\u00c0 {citta}   CAP {cap}   PROV. {prov}   "
        f"C. F. {cf}   "
        f"P.IVA {piva}   "
        f"EMAIL {email}   "
        f"PEC {pec}"
    )
    xml = xml.replace(old_anagrafica, new_anagrafica)

    # ── 2. IBAN ───────────────────────────────────────────────────────────────
    xml = xml.replace(
        "IBAN _________________________________________________________________________________________________________",
        f"IBAN {iban}"
    )

    # ── 3. FIRME: "Luogo e data:" ─────────────────────────────────────────────
    # Nel XML il tab è <w:tab/> e il testo è in due run separati
    xml = xml.replace(
        '<w:t xml:space="preserve">Luogo e data: </w:t>\n      <w:tab/><w:t>______________________________</w:t>',
        f'<w:t xml:space="preserve">Luogo e data:  Torino, {data_firma}</w:t>'
    )

    # ── 4. NOME PARTNER nelle righe firma ─────────────────────────────────────
    # "Il Partner \t\t______" → "Il Partner \t\t{nome} {cognome}"
    # Ci sono 2 occorrenze - la prima è la firma principale
    firma_tag = '<w:tab/><w:tab/><w:t xml:space="preserve">______________________________ </w:t>'
    firma_new = f'<w:tab/><w:tab/><w:t xml:space="preserve">{nome} {cognome} </w:t>'
    xml = xml.replace(firma_tag, firma_new, 2)  # entrambe le occorrenze

    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write(xml)

    # ── 5. REPACKING ──────────────────────────────────────────────────────────
    result = subprocess.run(
        ["python3", str(SCRIPTS_DIR / "pack.py"), tmp_dir, output_path,
         "--original", str(UNPACKED_TPL.parent / "Proforma_Partnership.docx"),
         "--validate", "false"],
        capture_output=True, text=True
    )
    shutil.rmtree(tmp_dir)

    if result.returncode != 0:
        raise RuntimeError(f"Pack fallito: {result.stderr}")

    return output_path


if __name__ == "__main__":
    dati_json = sys.argv[1] if len(sys.argv) > 1 else '{}'
    output    = sys.argv[2] if len(sys.argv) > 2 else "/tmp/contratto_test.docx"
    dati = json.loads(dati_json)
    result = genera_contratto(dati, output)
    print(f"OK:{result}")
