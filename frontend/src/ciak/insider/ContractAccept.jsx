import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { ContractBody } from '../components/ContractBody';

/**
 * ContractAccept — contratto in quattro passi, in ordine:
 *   1. Leggi il contratto (e lo accetti con un flag)
 *   2. Inserisci i tuoi dati (anagrafica che finisce nel contratto e nel PDF)
 *   3. Approva le clausole (secondo flag, distinto: approvazione specifica ex artt. 1341-1342 c.c.)
 *   4. Passa al pagamento
 *
 * Doppia sottoscrizione con i SOLI flag, nessuna firma disegnata: i due consensi sono atti
 * separati del cliente (prima la pagina mandava `clausole_vessatorie_approved: true` da sola).
 * Il luogo di accettazione e' Torino, FISSO: coincide col foro esclusivo dell'Art. 14.4 e non
 * lo sceglie il cliente. Data, ora e IP li registra il server.
 *
 * Le clausole da approvare si leggono dall'Art. 15.5 del testo che il cliente ha davanti
 * (stessa fonte di PDF e registro): se non si riesce a leggerle, il pagamento resta bloccato.
 *
 * Dichiarazione di finalita' imprenditoriale (Opzione A', validata dal legale il 9/9/2026):
 * checkbox separato, obbligatorio; la P.IVA e' facoltativa e vive nel modulo dei dati.
 */
export const LUOGO_ACCETTAZIONE = 'Torino';

const STEPS = ['Leggi il contratto', 'Inserisci i tuoi dati', 'Approva le clausole', 'Passa al pagamento'];

/**
 * I quattro passi in ordine, come "finestre" numerate. `corrente` = indice del passo in corso
 * (0-3): i precedenti risultano fatti. Con -1 (anteprima sulla scheda, prima di iniziare)
 * nessuno e' evidenziato. Stesso elemento sulla scheda e dentro il percorso.
 */
export function PassiContratto({ corrente = -1 }) {
  return (
    <ol className="insider-contract-steps" aria-label="I passi per entrare in Partnership">
      {STEPS.map((titolo, i) => (
        <li
          key={titolo}
          className={`insider-contract-step${i === corrente ? ' insider-contract-step--current' : ''}${i < corrente ? ' insider-contract-step--done' : ''}`}
          aria-current={i === corrente ? 'step' : undefined}
        >
          <span className="insider-contract-step__n" aria-hidden="true">
            {i < corrente ? <Check size={14} strokeWidth={3} /> : i + 1}
          </span>
          <span>{titolo}</span>
        </li>
      ))}
    </ol>
  );
}

const EMPTY_DATI = {
  nome: '', cognome: '', codice_fiscale: '', indirizzo: '', cap: '', citta: '', provincia: '',
  email: '', pec: '', nome_azienda: '', partita_iva: '',
};

const FIELDS = [
  { name: 'nome', label: 'Nome', autoComplete: 'given-name' },
  { name: 'cognome', label: 'Cognome', autoComplete: 'family-name' },
  { name: 'codice_fiscale', label: 'Codice fiscale', hint: '16 caratteri (11 cifre per una società)', autoComplete: 'off', maxLength: 16, wide: true },
  { name: 'indirizzo', label: 'Indirizzo di residenza o sede', hint: 'Via e numero civico', autoComplete: 'street-address', wide: true },
  { name: 'cap', label: 'CAP', inputMode: 'numeric', maxLength: 5, autoComplete: 'postal-code' },
  { name: 'citta', label: 'Città', autoComplete: 'address-level2' },
  { name: 'provincia', label: 'Provincia', hint: 'Sigla di 2 lettere, per esempio TO', maxLength: 2, autoComplete: 'address-level1' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', wide: true },
  { name: 'pec', label: 'PEC (facoltativa)', type: 'email', wide: true },
  { name: 'nome_azienda', label: 'Ragione sociale (facoltativa)', wide: true },
  { name: 'partita_iva', label: "Partita IVA (se ce l'hai)", hint: 'Facoltativa: 11 cifre', inputMode: 'numeric', wide: true },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/** Stesse regole del backend (`validate_dati_contratto`): il server resta l'ultima parola. */
export function validaDati(d) {
  const err = {};
  const v = (k) => String(d[k] || '').trim();
  if (!v('nome')) err.nome = 'Inserisci il nome';
  if (!v('cognome')) err.cognome = 'Inserisci il cognome';
  const cf = v('codice_fiscale').replace(/\s/g, '').toUpperCase();
  if (!cf) err.codice_fiscale = 'Inserisci il codice fiscale';
  else if (!/^([A-Z0-9]{16}|\d{11})$/.test(cf)) err.codice_fiscale = 'Controlla il codice fiscale: sono 16 caratteri (11 cifre per una società)';
  if (!v('indirizzo')) err.indirizzo = "Inserisci l'indirizzo";
  if (!v('cap')) err.cap = 'Inserisci il CAP';
  else if (!/^\d{5}$/.test(v('cap'))) err.cap = 'Il CAP ha 5 cifre';
  if (!v('citta')) err.citta = 'Inserisci la città';
  if (!v('provincia')) err.provincia = 'Inserisci la provincia';
  else if (!/^[A-Za-z]{2}$/.test(v('provincia'))) err.provincia = 'Usa la sigla di 2 lettere, per esempio TO';
  if (!v('email')) err.email = "Inserisci l'email";
  else if (!EMAIL_RE.test(v('email'))) err.email = "Controlla l'indirizzo email";
  if (v('pec') && !EMAIL_RE.test(v('pec'))) err.pec = "Controlla l'indirizzo PEC";
  const piva = v('partita_iva').replace(/\s/g, '').toUpperCase().replace(/^IT/, '');
  if (piva && !/^\d{11}$/.test(piva)) err.partita_iva = 'La partita IVA ha 11 cifre';
  return err;
}

/** Elenco dell'Art. 15.5 dal testo del contratto. Vuoto se la sezione non si trova. */
export function estraiClausole(text) {
  const out = [];
  let dentro = false;
  for (const riga of String(text || '').split(/\r?\n/)) {
    const s = riga.trim();
    if (!dentro) {
      if (/^15\.5\b/.test(s) && /Approvazione specifica/i.test(s)) dentro = true;
      continue;
    }
    if (/^15\.6\b/.test(s) || /^ARTICOLO\b/.test(s)) break;
    if (s.startsWith('•')) out.push(s.replace(/^•\s*/, '').replace(/[;.]\s*$/, '').trim());
  }
  return out;
}

function dataOggi() {
  try {
    return new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
  } catch {
    return new Date().toLocaleDateString('it-IT');
  }
}

export default function ContractAccept({ partnerId, onDati, onConfirm, disabled = false }) {
  const [step, setStep] = useState(0);
  const [contractText, setContractText] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadedPartnerId, setLoadedPartnerId] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [dati, setDati] = useState(EMPTY_DATI);
  const [errori, setErrori] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [specific, setSpecific] = useState(false);
  const [declared, setDeclared] = useState(false);

  useEffect(() => {
    setStep(0);
    setAccepted(false);
    setDati(EMPTY_DATI);
    setErrori({});
    setSaveError('');
    setSaving(false);
    setSpecific(false);
    setDeclared(false);
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
        } else setLoadFailed(true);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const contractReady = !!partnerId && loadedPartnerId === partnerId && !!contractText.trim() && !loadFailed;
  const clausole = contractReady ? estraiClausole(contractText) : [];
  const oggi = dataOggi();

  const setCampo = (name, value) => {
    setDati((d) => ({ ...d, [name]: value }));
    if (errori[name]) setErrori((e) => ({ ...e, [name]: undefined }));
  };

  async function vaiAiDati(e) {
    e.preventDefault();
    const err = validaDati(dati);
    setErrori(err);
    setSaveError('');
    if (Object.keys(err).length) return;
    setSaving(true);
    try {
      if (onDati) await onDati(dati);
      setStep(2);
    } catch (ex) {
      setSaveError(ex?.message || 'Non siamo riusciti a salvare i dati. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  const canConfirm = !disabled && contractReady && accepted && specific && declared && clausole.length > 0
    && Object.keys(validaDati(dati)).length === 0;

  return (
    <div className="insider-contract-accept">
      <PassiContratto corrente={step} />

      {step === 0 && (
        <section aria-labelledby="ca-passo-1">
          <h3 id="ca-passo-1" className="insider-contract-accept__step-title">Passo 1 di 4 · Leggi il contratto</h3>
          <div className="insider-contract-accept__text" role="region" aria-label="Testo del contratto">
            {contractText
              ? <ContractBody text={contractText} />
              : (loadFailed
                ? 'Non è stato possibile caricare il testo del contratto. Riprova tra poco.'
                : 'Caricamento testo contratto…')}
          </div>
          <label className="insider-contract-accept__consent">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>Dichiaro di aver letto e accettato le condizioni del contratto qui sopra.</span>
          </label>
          <button
            type="button"
            className="insider-contract-accept__cta"
            disabled={disabled || !contractReady || !accepted}
            onClick={() => setStep(1)}
          >
            Avanti: i tuoi dati
          </button>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="ca-passo-2">
          <h3 id="ca-passo-2" className="insider-contract-accept__step-title">Passo 2 di 4 · Inserisci i tuoi dati</h3>
          <p className="insider-contract-accept__lead">
            Sono i dati che compaiono nel contratto come tua identificazione. Controllali bene.
          </p>
          <form className="insider-contract-accept__form" onSubmit={vaiAiDati} noValidate>
            {FIELDS.map((f) => (
              <div key={f.name} className={`insider-contract-accept__field${f.wide ? ' insider-contract-accept__field--wide' : ''}`}>
                <label htmlFor={`ca-${f.name}`}>{f.label}</label>
                <input
                  id={`ca-${f.name}`}
                  name={f.name}
                  type={f.type || 'text'}
                  inputMode={f.inputMode}
                  autoComplete={f.autoComplete}
                  maxLength={f.maxLength}
                  value={dati[f.name]}
                  onChange={(e) => setCampo(f.name, e.target.value)}
                  aria-invalid={errori[f.name] ? 'true' : undefined}
                  aria-describedby={errori[f.name] ? `ca-${f.name}-err` : (f.hint ? `ca-${f.name}-hint` : undefined)}
                />
                {errori[f.name]
                  ? <span id={`ca-${f.name}-err`} className="insider-contract-accept__error" role="alert">{errori[f.name]}</span>
                  : (f.hint ? <span id={`ca-${f.name}-hint`} className="insider-contract-accept__hint">{f.hint}</span> : null)}
              </div>
            ))}
            {saveError ? <p className="insider-contract-accept__error insider-contract-accept__field--wide" role="alert">{saveError}</p> : null}
            <div className="insider-contract-accept__actions insider-contract-accept__field--wide">
              <button type="button" className="insider-contract-accept__back" onClick={() => setStep(0)}>Indietro</button>
              <button type="submit" className="insider-contract-accept__cta" disabled={disabled || saving}>
                {saving ? 'Salvo i dati…' : 'Avanti: le clausole'}
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="ca-passo-3">
          <h3 id="ca-passo-3" className="insider-contract-accept__step-title">Passo 3 di 4 · Approva le clausole</h3>
          <p className="insider-contract-accept__lead">
            Queste clausole richiedono la tua approvazione specifica, ai sensi degli articoli 1341 e 1342 del Codice civile.
            Leggile con attenzione: sono nel testo del contratto che hai appena letto.
          </p>
          {clausole.length > 0 ? (
            <ol className="insider-contract-clauses" aria-label="Clausole da approvare specificamente">
              {clausole.map((c) => <li key={c}>{c}</li>)}
            </ol>
          ) : (
            <p role="alert" className="insider-contract-accept__error">
              Non siamo riusciti a mostrarti l&apos;elenco delle clausole. Ricarica la pagina o scrivi ad assistenza@evolution-pro.it.
            </p>
          )}
          <label className="insider-contract-accept__consent">
            <input type="checkbox" checked={specific} onChange={(e) => setSpecific(e.target.checked)} />
            <span>
              Approvo specificamente, ai sensi degli artt. 1341 e 1342 del Codice civile, le clausole elencate qui sopra.
            </span>
          </label>
          {/*
           * Dichiarazione di finalità imprenditoriale (Opzione A'): tiene la vendita B2B senza
           * richiedere P.IVA, escludendo il recesso da consumatore ex Codice del Consumo.
           * Testo validato dal legale/commercialista di Claudio (9/9/2026), allineato all'Art. 9.
           */}
          <label className="insider-contract-accept__consent insider-contract-accept__declaration">
            <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
            <span>
              Dichiaro di aderire per avviare o gestire la mia attività economica in partnership e percepire i proventi
              delle vendite del mio corso; agisco a fini imprenditoriali e non come consumatore ai sensi del Codice del Consumo.
            </span>
          </label>
          <p className="insider-contract-accept__place">
            Luogo e data: <strong>{LUOGO_ACCETTAZIONE}, {oggi}</strong>
          </p>
          <p className="insider-contract-accept__small-print">
            I due consensi (accettazione del contratto e approvazione delle clausole) restano distinti. Vengono registrati
            con luogo, data, ora e indirizzo IP.
          </p>
          <div className="insider-contract-accept__actions">
            <button type="button" className="insider-contract-accept__back" onClick={() => setStep(1)}>Indietro</button>
            <button
              type="button"
              className="insider-contract-accept__cta"
              disabled={disabled || !specific || !declared || clausole.length === 0}
              onClick={() => setStep(3)}
            >
              Avanti: il pagamento
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="ca-passo-4">
          <h3 id="ca-passo-4" className="insider-contract-accept__step-title">Passo 4 di 4 · Passa al pagamento</h3>
          <dl className="insider-contract-accept__recap">
            <div><dt>Intestato a</dt><dd>{dati.nome.trim()} {dati.cognome.trim()}</dd></div>
            <div><dt>Codice fiscale</dt><dd>{dati.codice_fiscale.trim().toUpperCase()}</dd></div>
            <div><dt>Indirizzo</dt><dd>{dati.indirizzo.trim()}, {dati.cap.trim()} {dati.citta.trim()} ({dati.provincia.trim().toUpperCase()})</dd></div>
            <div><dt>Email</dt><dd>{dati.email.trim()}</dd></div>
          </dl>
          <ul className="insider-contract-accept__done">
            <li><Check size={16} strokeWidth={3} aria-hidden="true" /> Contratto letto e accettato</li>
            <li><Check size={16} strokeWidth={3} aria-hidden="true" /> Clausole approvate specificamente · {LUOGO_ACCETTAZIONE}, {oggi}</li>
          </ul>
          <p className="insider-contract-accept__lead">
            Premendo il pulsante si apre il pagamento, dove puoi scegliere carta o Klarna (Klarna solo se disponibile per l&apos;importo).
          </p>
          <div className="insider-contract-accept__actions">
            <button type="button" className="insider-contract-accept__back" onClick={() => setStep(1)} disabled={disabled}>Correggi i dati</button>
            <button
              type="button"
              className="insider-contract-accept__cta"
              disabled={!canConfirm}
              onClick={() => {
                if (canConfirm) {
                  onConfirm({
                    consenso_contratto: true,
                    approvazione_specifica_clausole: true,
                    dichiarazione_imprenditoriale: true,
                    piva: dati.partita_iva.trim(),
                  });
                }
              }}
            >
              Paga e conferma la Partnership
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
