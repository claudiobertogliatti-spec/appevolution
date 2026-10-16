/**
 * assistenteStream — client della chat dell'area Start (POST /api/ciak/client/start/assistente, SSE).
 * Il lavoro vero e' in `components/assistenteSse` (lo stesso dell'assistente partner).
 */
import { getClientToken } from "../api";
import { ChatError, streamSse } from "../../components/assistenteSse";

export { ChatError };

export function streamAssistente({ message, history = [], signal, onText, fetchImpl }) {
  return streamSse({
    url: "/api/ciak/client/start/assistente",
    token: getClientToken(),
    message,
    history,
    signal,
    onText,
    fetchImpl,
  });
}
