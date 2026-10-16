/**
 * partnerAssistenteStream — client della chat dell'area partner
 * (POST /api/partner-assistente/{partner_id}/chat, SSE). Il token e' quello del partner (o dell'admin in
 * vista supervisione): il server controlla che il partner scriva solo per se stesso.
 */
import { API } from "../../../utils/api-config";
import { getToken } from "../api";
import { ChatError, streamSse } from "../../components/assistenteSse";

export { ChatError };

export function streamPartnerAssistente(partnerId) {
  return ({ message, history = [], signal, onText, fetchImpl }) =>
    streamSse({
      url: `${API || ""}/api/partner-assistente/${encodeURIComponent(partnerId)}/chat`,
      token: getToken(),
      message,
      history,
      signal,
      onText,
      fetchImpl,
    });
}
