"""
genera_contratto_pdf.py
Genera contratto precompilato partendo dal PDF template.
Crea un nuovo PDF con i dati del partner sovrapposti.
"""
import os
import json
from datetime import datetime
from pathlib import Path
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from PyPDF2 import PdfReader, PdfWriter

TEMPLATE_PDF = Path("/app/backend/contratto_template/Proforma_Partnership.pdf")
OUTPUT_DIR = Path("/app/backend/static/contratti")

# Assicura che la directory output esista
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def genera_contratto_pdf(dati: dict, output_filename: str = None) -> str:
    """
    Genera un contratto PDF precompilato con i dati del partner.
    
    Args:
        dati: Dizionario con i dati del partner:
            - nome, cognome, azienda, indirizzo, citta, cap, prov
            - codice_fiscale, partita_iva, email, pec, iban
            - data_firma (opzionale, default: oggi)
        output_filename: Nome file output (opzionale)
    
    Returns:
        Path del file PDF generato
    """
    nome = dati.get("nome", "")
    cognome = dati.get("cognome", "")
    azienda = dati.get("azienda", "—")
    indirizzo = dati.get("indirizzo", "")
    citta = dati.get("citta", "")
    cap = dati.get("cap", "")
    prov = dati.get("prov", "")
    cf = dati.get("codice_fiscale", "")
    piva = dati.get("partita_iva", "—")
    email = dati.get("email", "")
    pec = dati.get("pec", "—")
    iban = dati.get("iban", "")
    data_firma = dati.get("data_firma", datetime.now().strftime("%d/%m/%Y"))
    partner_id = dati.get("partner_id", "unknown")
    
    if not output_filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = f"{nome}_{cognome}".replace(" ", "_").lower()
        output_filename = f"contratto_{safe_name}_{timestamp}.pdf"
    
    output_path = OUTPUT_DIR / output_filename
    
    # Leggi il template PDF
    if not TEMPLATE_PDF.exists():
        raise FileNotFoundError(f"Template PDF non trovato: {TEMPLATE_PDF}")
    
    reader = PdfReader(str(TEMPLATE_PDF))
    writer = PdfWriter()
    
    # Crea overlay per la prima pagina con i dati del partner
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=A4)
    width, height = A4
    
    # Font settings
    c.setFont("Helvetica", 9)
    
    # Posizioni dei campi nella prima pagina (coordinate Y dal basso)
    # Questi valori devono essere calibrati in base al layout del PDF
    # La sezione anagrafica è circa a metà della prima pagina
    
    y_base = height - 200 * mm  # Circa 200mm dal top
    
    # Campo NOME
    c.drawString(45 * mm, y_base + 25 * mm, nome)
    
    # Campo COGNOME  
    c.drawString(100 * mm, y_base + 25 * mm, cognome)
    
    # Campo AZIENDA
    c.drawString(155 * mm, y_base + 25 * mm, azienda)
    
    # Campo INDIRIZZO
    c.drawString(45 * mm, y_base + 18 * mm, indirizzo)
    
    # Campo CITTA
    c.drawString(115 * mm, y_base + 18 * mm, citta)
    
    # Campo CAP
    c.drawString(155 * mm, y_base + 18 * mm, cap)
    
    # Campo PROV
    c.drawString(180 * mm, y_base + 18 * mm, prov)
    
    # Campo C.F.
    c.drawString(45 * mm, y_base + 11 * mm, cf)
    
    # Campo EMAIL
    c.drawString(115 * mm, y_base + 11 * mm, email)
    
    # Campo P.IVA
    c.drawString(45 * mm, y_base + 4 * mm, piva)
    
    # Campo PEC
    c.drawString(115 * mm, y_base + 4 * mm, pec)
    
    # Campo IBAN
    c.drawString(45 * mm, y_base - 3 * mm, iban)
    
    c.save()
    
    # Riavvolgi il buffer
    packet.seek(0)
    overlay_reader = PdfReader(packet)
    overlay_page = overlay_reader.pages[0]
    
    # Combina template con overlay per ogni pagina
    for i, page in enumerate(reader.pages):
        if i == 0:
            # Prima pagina: aggiungi overlay con dati partner
            page.merge_page(overlay_page)
        writer.add_page(page)
    
    # Aggiungi overlay per la pagina delle firme (ultima pagina)
    # Crea overlay per firma
    packet2 = BytesIO()
    c2 = canvas.Canvas(packet2, pagesize=A4)
    c2.setFont("Helvetica", 10)
    
    # Firma e data (posizione approssimativa - da calibrare)
    c2.drawString(60 * mm, 100 * mm, f"Torino, {data_firma}")
    c2.drawString(60 * mm, 70 * mm, f"{nome} {cognome}")
    
    c2.save()
    packet2.seek(0)
    
    # Scrivi il file finale
    with open(output_path, "wb") as output_file:
        writer.write(output_file)
    
    return str(output_path)


def get_contratto_url(filename: str) -> str:
    """Restituisce l'URL pubblico del contratto"""
    return f"/static/contratti/{filename}"


if __name__ == "__main__":
    import sys
    
    # Test
    test_dati = {
        "nome": "Mario",
        "cognome": "Rossi",
        "azienda": "Test SRL",
        "indirizzo": "Via Roma 1",
        "citta": "Milano",
        "cap": "20100",
        "prov": "MI",
        "codice_fiscale": "RSSMRA80A01F205X",
        "partita_iva": "12345678901",
        "email": "mario@test.com",
        "pec": "mario@pec.test.com",
        "iban": "IT60X0542811101000000123456"
    }
    
    if len(sys.argv) > 1:
        test_dati = json.loads(sys.argv[1])
    
    result = genera_contratto_pdf(test_dati)
    print(f"Contratto generato: {result}")
