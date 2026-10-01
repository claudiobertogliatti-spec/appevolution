"""Revisione del funnel da parte del partner (F-13): logica pura."""
import pytest

import services.funnel_review as fr

pytestmark = pytest.mark.unit

NOW = "2026-10-02T10:00:00+00:00"
URL = "https://sabai-daniele-andolfi.vercel.app"


def _rec(**kw):
    base = {"preview_url": URL, "preview_version": 1, "preview_released": True}
    base.update(kw)
    return base


def _apply(rec, update):
    """Applica $set/$push in modo minimale (path puntati) per verificare lo stato risultante."""
    rec = {k: (dict(v) if isinstance(v, dict) else v) for k, v in rec.items()}
    for path, value in (update.get("$set") or {}).items():
        node = rec
        parts = path.split(".")
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = value
    for path, value in (update.get("$push") or {}).items():
        node = rec
        parts = path.split(".")
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node.setdefault(parts[-1], []).append(value)
    return rec


def test_partner_sees_nothing_until_the_team_releases_the_preview():
    state = fr.review_state({"preview_url": URL, "preview_version": 1})  # non rilasciata
    assert state["released"] is False and state["pages"] == [] and state["preview_url"] is None
    assert state["golive"]["can_request"] is False
    assert "preparando" in state["golive"]["missing"][0]


def test_a_released_preview_still_needs_a_valid_vercel_host():
    for bad in ("https://evil.example/x", "http://x.vercel.app", None, ""):
        assert fr.review_state({"preview_url": bad, "preview_released": True})["released"] is False


def test_released_preview_lists_the_four_pages_with_full_urls():
    state = fr.review_state(_rec())
    assert [p["id"] for p in state["pages"]] == ["optin", "masterclass", "offerta", "grazie"]
    assert state["pages"][0]["url"] == URL + "/"
    assert state["pages"][2]["url"] == URL + "/offerta.html"
    assert all(p["state"] == fr.DA_CONTROLLARE for p in state["pages"])


def test_approving_marks_only_that_page_for_the_current_version():
    rec = _rec()
    rec = _apply(rec, fr.approve_update(rec, "offerta", NOW))
    state = fr.review_state(rec)
    states = {p["id"]: p["state"] for p in state["pages"]}
    assert states["offerta"] == fr.APPROVATA and states["optin"] == fr.DA_CONTROLLARE


def test_cannot_approve_before_release_or_unknown_page():
    with pytest.raises(fr.ReviewError):
        fr.approve_update({"preview_url": URL}, "offerta", NOW)
    with pytest.raises(fr.ReviewError):
        fr.approve_update(_rec(), "inesistente", NOW)


def test_a_correction_needs_both_fields_and_blocks_approval_until_resolved():
    rec = _rec()
    with pytest.raises(fr.ReviewError):
        fr.correction_update(rec, "offerta", "", "x", NOW)
    with pytest.raises(fr.ReviewError):
        fr.correction_update(rec, "offerta", "Il prezzo", "ab", NOW)
    update, entry = fr.correction_update(rec, "offerta", "Il prezzo è 297", "Il prezzo è 247", NOW)
    rec = _apply(rec, update)
    assert entry["status"] == "aperta" and entry["version"] == 1
    page = {p["id"]: p for p in fr.review_state(rec)["pages"]}["offerta"]
    assert page["state"] == fr.IN_MODIFICA and page["open_corrections"] == 1
    with pytest.raises(fr.ReviewError):  # non si può approvare con una segnalazione aperta
        fr.approve_update(rec, "offerta", NOW)


def test_corrections_strip_markup_and_limit_length():
    update, entry = fr.correction_update(_rec(), "optin", "<b>Titolo</b> sbagliato", "Il   titolo giusto", NOW)
    assert "<" not in entry["wrong"] and entry["right"] == "Il titolo giusto"
    with pytest.raises(fr.ReviewError):
        fr.correction_update(_rec(), "optin", "x" * (fr.WRONG_MAX + 1), "ok ok", NOW)


def test_new_version_invalidates_only_the_pages_touched_and_closes_their_corrections():
    rec = _rec()
    for page in ("optin", "masterclass", "offerta"):
        rec = _apply(rec, fr.approve_update(rec, page, NOW))
    update, _ = fr.correction_update(rec, "offerta", "Il prezzo era 297", "Il prezzo è 247", NOW)
    rec = _apply(rec, update)
    rec = _apply(rec, fr.new_version_update(rec, 2, ["offerta"], NOW))
    states = {p["id"]: p["state"] for p in fr.review_state(rec)["pages"]}
    # optin e masterclass restano approvate sulla nuova versione; l'offerta va rivista
    assert states == {"optin": fr.APPROVATA, "masterclass": fr.APPROVATA,
                      "offerta": fr.DA_CONTROLLARE, "grazie": fr.DA_CONTROLLARE}
    assert rec["review"]["corrections"][0]["status"] == "risolta"
    assert fr.review_state(rec)["version"] == 2


def test_an_approval_of_an_older_version_is_not_valid_anymore():
    rec = _rec()
    rec = _apply(rec, fr.approve_update(rec, "optin", NOW))
    rec["preview_version"] = 2  # versione cambiata senza passare da new_version_update
    assert {p["id"]: p["state"] for p in fr.review_state(rec)["pages"]}["optin"] == fr.DA_CONTROLLARE


def test_go_live_needs_every_page_the_legal_data_the_documents_and_the_team():
    rec = _rec(documents_released=True)
    with pytest.raises(fr.ReviewError):
        fr.golive_update(rec, NOW)
    for page in ("optin", "masterclass", "offerta", "grazie", fr.LEGAL_ID):
        rec = _apply(rec, fr.approve_update(rec, page, NOW))
    assert fr.review_state(rec)["golive"]["can_request"] is False  # mancano i documenti
    rec = _apply(rec, fr.approve_update(rec, fr.DOCS_ID, NOW))
    state = fr.review_state(rec)
    assert state["golive"]["can_request"] is False  # il team non ha ancora finito
    assert any("collegamenti" in m for m in state["golive"]["missing"])
    rec["team_ready"] = True
    assert fr.review_state(rec)["golive"]["can_request"] is True
    rec = _apply(rec, fr.golive_update(rec, NOW))
    assert fr.review_state(rec)["golive"]["requested"] is True


def test_progress_counts_pages_legal_and_connections_only_when_really_done():
    rec = _rec()
    assert fr.review_state(rec)["progress"] == 0
    rec = _apply(rec, fr.approve_update(rec, "optin", NOW))
    rec["connections"] = {"dominio": True}
    assert fr.review_state(rec)["progress"] == round(2 / 10 * 100)


def test_admin_can_only_set_whitelisted_fields_with_a_vercel_preview():
    rec = _rec()
    update = fr.admin_set_update(rec, {"team_ready": True, "connections": {"pagamento": True}}, NOW)
    assert update["$set"]["team_ready"] is True and update["$set"]["connections.pagamento"] is True
    with pytest.raises(fr.ReviewError):
        fr.admin_set_update(rec, {"preview_url": "https://evil.example"}, NOW)
    with pytest.raises(fr.ReviewError):
        fr.admin_set_update(rec, {"connections": {"inventato": True}}, NOW)
    with pytest.raises(fr.ReviewError):
        fr.admin_set_update(rec, {"blueprint_approved": True}, NOW)
    with pytest.raises(fr.ReviewError):
        fr.admin_set_update(rec, {}, NOW)


def test_legal_data_shows_only_what_goes_into_the_legal_pages():
    partner = {"name": "Daniele Andolfi", "email": "x@y.it", "dati_burocrazia": {
        "nome": "Daniele", "cognome": "Andolfi", "partita_iva": "01234567890", "indirizzo": "Via Roma 1",
        "cap": "55041", "comune": "Camaiore", "provincia": "LU", "email": "info@d.it",
        "codice_fiscale": "SEGRETO", "iban": "SEGRETO", "data_nascita": "SEGRETO"}}
    data = fr.legal_data_from_partner(partner)
    assert data["Titolare"] == "Daniele Andolfi" and data["Partita IVA"] == "01234567890"
    assert data["Sede"] == "Via Roma 1, 55041 Camaiore (LU)" and data["Email"] == "info@d.it"
    assert "SEGRETO" not in str(data)


def test_steps_for_a_partner_with_nothing_released_start_from_the_data():
    state = fr.review_state({}, {"Titolare": "X"})
    states = {s["id"]: s["state"] for s in state["steps"]}
    assert [s["id"] for s in state["steps"]] == ["dati", "funnel", "documenti", "dominio", "via_libera"]
    assert states == {"dati": "da_fare", "funnel": "attesa", "documenti": "attesa",
                      "dominio": "attesa", "via_libera": "attesa"}
    assert state["current_step"] == "dati"


def test_data_can_be_confirmed_or_corrected_before_the_preview_is_released():
    rec = {}
    rec = _apply(rec, fr.approve_update(rec, fr.LEGAL_ID, NOW))
    state = fr.review_state(rec)
    assert state["legal"]["state"] == fr.APPROVATA and state["current_step"] == "funnel"
    assert {s["id"]: s["state"] for s in state["steps"]}["dati"] == "fatto"
    with pytest.raises(fr.ReviewError):  # le pagine restano chiuse finché il team non rilascia
        fr.approve_update({}, "optin", NOW)
    update, entry = fr.correction_update({}, fr.LEGAL_ID, "La sede è sbagliata", "Via Roma 1, Pisa", NOW)
    assert entry["page"] == fr.LEGAL_ID


def test_current_step_follows_what_the_partner_has_to_do_next():
    rec = _rec(documents_released=True)
    rec = _apply(rec, fr.approve_update(rec, fr.LEGAL_ID, NOW))
    assert fr.review_state(rec)["current_step"] == "funnel"
    for page in ("optin", "masterclass", "offerta", "grazie"):
        rec = _apply(rec, fr.approve_update(rec, page, NOW))
    states = {s["id"]: s["state"] for s in fr.review_state(rec)["steps"]}
    assert states["funnel"] == "fatto" and states["documenti"] == "da_fare" and states["via_libera"] == "attesa"
    rec = _apply(rec, fr.approve_update(rec, fr.DOCS_ID, NOW))
    states = {s["id"]: s["state"] for s in fr.review_state(rec)["steps"]}
    assert states["documenti"] == "fatto" and states["via_libera"] == "attesa"  # il team non ha finito
    rec["team_ready"] = True
    rec["connections"] = {}
    assert {s["id"]: s["state"] for s in fr.review_state(rec)["steps"]}["via_libera"] == "da_fare"
    rec = _apply(rec, fr.golive_update(rec, NOW))
    assert {s["id"]: s["state"] for s in fr.review_state(rec)["steps"]}["via_libera"] == "fatto"


def test_documents_stay_closed_until_the_team_releases_them():
    rec = _rec()
    state = fr.review_state(rec)
    assert state["documents"]["released"] is False
    assert {s["id"]: s["state"] for s in state["steps"]}["documenti"] == "attesa"
    with pytest.raises(fr.ReviewError):
        fr.approve_update(rec, fr.DOCS_ID, NOW)
    with pytest.raises(fr.ReviewError):
        fr.correction_update(rec, fr.DOCS_ID, "Il rimborso è sbagliato", "Dovrebbe essere 30 giorni", NOW)
    rec = _apply(rec, fr.admin_set_update(rec, {"documents_released": True}, NOW))
    assert rec["documents_released_at"] == NOW
    assert {s["id"]: s["state"] for s in fr.review_state(rec)["steps"]}["documenti"] == "da_fare"
    # senza anteprima rilasciata i documenti restano chiusi anche se il flag è acceso
    assert fr.docs_released({"documents_released": True}) is False
