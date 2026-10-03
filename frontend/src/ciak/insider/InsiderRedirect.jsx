import React from 'react';
import { Navigate } from 'react-router-dom';
import { getClientToken } from '../client/api';

/**
 * Vecchio indirizzo /insider/:token. La pagina di chiusura e' stata assorbita dall'area cliente
 * (Home personalizzata sul Blueprint, pagina Start, pagina Partnership con contratto e pagamento):
 * una sola pagina prima dell'acquisto.
 *
 * - con la sessione cliente attiva: si va alla Home;
 * - senza: all'accesso, dove "Rimandami l'accesso" rimanda il link personale per email.
 * Il token della proposta NON apre piu' nulla da solo: non e' piu' una porta d'ingresso.
 */
export default function InsiderRedirect() {
  return <Navigate to={getClientToken() ? '/cliente' : '/cliente/accesso'} replace />;
}
