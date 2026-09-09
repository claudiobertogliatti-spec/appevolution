import React, { useEffect, useState } from 'react';

/**
 * ContractAccept — testo del contratto leggibile + checkbox, stile bancario (Task 7).
 *
 * Consenso informato per davvero: prima qui c'era un link a
 * `/api/contract/text/{partnerId}`, che risponde JSON (`{contract_text,
 * params}`) — un prospect che ci cliccava vedeva un blob JSON grezzo, non il
 * contratto. Ora il testo viene fetchato e reso per intero qui sotto, stesso
 * endpoint e stesso pattern di `ContrattoInline` in
 * `frontend/src/ciak/pages/Proposta.jsx` (~riga 807).
 *
 * Nessuna firma disegnata richiesta qui: il consenso via checkbox è già
 * accettato dal backend (`POST /{token}/firma-contratto` con
 * `consenso_checkbox: true`, Task 3). Il bottone di pagamento resta
 * disabilitato finché il contratto non è caricato ed entrambi i checkbox
 * non sono spuntati. Il backend applica separatamente i gate al checkout.
 *
 * Opzione A' (decisione prodotto/legale post-review): la vendita resta B2B
 * (niente diritto di recesso da consumatore) tramite una dichiarazione di
 * finalità imprenditoriale, senza richiedere la P.IVA. Due checkbox
 * SEPARATI e indipendenti — condizioni contrattuali + dichiarazione
 * imprenditoriale — entrambi obbligatori per sbloccare il pagamento. La
 * P.IVA resta un campo facoltativo: non fa parte del gate.
 */
export default function ContractAccept({ partnerId, onConfirm, disabled = false }) {
  const [checked, setChecked] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [piva, setPiva] = useState('');
  const [contractText, setContractText] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadedPartnerId, setLoadedPartnerId] = useState(null);

  useEffect(() => {
    setChecked(false);
    setDeclared(false);
    setPiva('');
    setContractText('');
    setLoadedPartnerId(null);
    setLoadFailed(!partnerId);
    if (!partnerId) return undefined;
    let cancelled = false;
    fetch(`/api/contract/text/${partnerId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Errore ${r.status}`))))
      .then((d) => {
        if (cancelled) return;
        if (typeof d?.contract_text === 'string' && d.contract_text.trim()) {
          setContractText(d.contract_text);
          setLoadedPartnerId(partnerId);
        }
        else setLoadFailed(true);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const canConfirm = !disabled && !!partnerId && loadedPartnerId === partnerId
    && !!contractText.trim() && !loadFailed && checked && declared;

  return (
    <div className="insider-contract-accept">
      <div
        className="insider-contract-accept__text"
        role="region"
        aria-label="Testo del contratto"
      >
        {contractText
          || (loadFailed
            ? 'Non è stato possibile caricare il testo del contratto. Riprova tra poco.'
            : 'Caricamento testo contratto…')}
      </div>
      <label className="insider-contract-accept__consent">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>Dichiaro di aver letto e accettato le condizioni del contratto qui sopra.</span>
      </label>
      <div className="insider-contract-accept__piva-field">
        <label htmlFor="insider-contract-accept-piva">Partita IVA (se ce l&apos;hai)</label>
        <input
          id="insider-contract-accept-piva"
          type="text"
          value={piva}
          onChange={(e) => setPiva(e.target.value)}
          placeholder="Facoltativa"
        />
      </div>
      {/*
       * Dichiarazione di finalità imprenditoriale (Opzione A'): tiene la
       * vendita B2B senza richiedere P.IVA, escludendo il recesso da
       * consumatore ex Codice del Consumo. Testo validato dal legale/
       * commercialista di Claudio (9/9/2026) e allineato all'Art. 9 del
       * contratto (render_contract_text), scenari con/senza P.IVA.
       */}
      <label className="insider-contract-accept__consent insider-contract-accept__declaration">
        <input
          type="checkbox"
          checked={declared}
          onChange={(e) => setDeclared(e.target.checked)}
        />
        <span>
          Dichiaro di aderire per avviare o gestire la mia attività economica in
          partnership e percepire i proventi delle vendite del mio corso; agisco a
          fini imprenditoriali e non come consumatore ai sensi del Codice del
          Consumo.
        </span>
      </label>
      <p className="insider-contract-accept__small-print">
        Niente firma disegnata: il consenso qui sopra vale come accettazione
        del contratto, con data, ora e indirizzo IP registrati a riprova.
      </p>
      <button
        type="button"
        className="insider-contract-accept__cta"
        disabled={!canConfirm}
        onClick={() => {
          if (canConfirm) onConfirm({ dichiarazione_imprenditoriale: true, piva });
        }}
      >
        Paga e conferma la Partnership
      </button>
    </div>
  );
}
