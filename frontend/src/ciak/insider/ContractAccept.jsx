import React, { useState } from 'react';

/**
 * ContractAccept — checkbox + link al contratto, stile bancario (Task 7).
 *
 * Nessuna firma disegnata richiesta qui: il consenso via checkbox è già
 * accettato dal backend (`POST /{token}/firma-contratto` con
 * `consenso_checkbox: true`, Task 3). Il bottone di pagamento resta
 * disabilitato finché il checkbox non è spuntato — è l'unico gate, e non è
 * aggirabile: nessun default `checked`, nessuna scorciatoia.
 */
export default function ContractAccept({ contractUrl, onConfirm }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="insider-contract-accept">
      <label className="insider-contract-accept__consent">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          Dichiaro di aver letto e accettato le{' '}
          <a href={contractUrl} target="_blank" rel="noreferrer">
            condizioni del contratto
          </a>
          .
        </span>
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
