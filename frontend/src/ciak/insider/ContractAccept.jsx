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
 * disabilitato finché il checkbox non è spuntato — è l'unico gate, e non è
 * aggirabile: nessun default `checked`, nessuna scorciatoia.
 */
export default function ContractAccept({ partnerId, onConfirm }) {
  const [checked, setChecked] = useState(false);
  const [contractText, setContractText] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!partnerId) return undefined;
    let cancelled = false;
    fetch(`/api/contract/text/${partnerId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Errore ${r.status}`))))
      .then((d) => {
        if (cancelled) return;
        if (d?.contract_text) setContractText(d.contract_text);
        else setLoadFailed(true);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

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
      <p className="insider-contract-accept__small-print">
        Niente firma disegnata: il consenso qui sopra vale come accettazione
        del contratto, con data, ora e indirizzo IP registrati a riprova.
      </p>
      <button
        type="button"
        className="insider-contract-accept__cta"
        disabled={!checked}
        onClick={onConfirm}
      >
        Paga e conferma la Partnership
      </button>
    </div>
  );
}
