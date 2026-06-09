"""
Ciak — wrapper LLM nativo Anthropic, drop-in per la vecchia API Emergent.

Sostituisce `from emergentintegrations.llm.chat import LlmChat, UserMessage`
con classi compatibili che usano il pacchetto `anthropic` (AsyncAnthropic)
sotto il cofano. Tutti i call site del codebase usano provider "anthropic"
(nessun OpenAI/Gemini) e solo testo, quindi l'interfaccia resta identica:

    chat = LlmChat(api_key=..., session_id=..., system_message=SYS) \
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    testo = await chat.send_message(UserMessage(text=PROMPT))   # -> str

Chiave: usa ANTHROPIC_API_KEY (la stessa del codice nativo gia' migrato, es.
services/ciak_analisi.py), con fallback alla chiave passata dal call site e a
EMERGENT_LLM_KEY (che in produzione e' comunque una chiave Anthropic).
"""
import os

import anthropic

DEFAULT_MODEL = "claude-sonnet-4-5-20250929"
DEFAULT_MAX_TOKENS = 4096


def _api_key(passed: str = "") -> str:
    return (
        os.environ.get("ANTHROPIC_API_KEY")
        or passed
        or os.environ.get("EMERGENT_LLM_KEY")
        or ""
    )


def _extract_text(resp) -> str:
    parts = []
    for block in (getattr(resp, "content", None) or []):
        t = getattr(block, "text", None)
        if t:
            parts.append(t)
    return "".join(parts).strip()


class UserMessage:
    """Compat: messaggio utente (solo testo)."""

    def __init__(self, text: str = "", **_ignored):
        self.text = text


class LlmChat:
    """Compat con emergentintegrations.llm.chat.LlmChat — backend Anthropic nativo."""

    def __init__(self, api_key: str = "", session_id: str = "", system_message: str = "", **_ignored):
        self._api_key = api_key or ""
        self._system = system_message or ""
        self._model = DEFAULT_MODEL
        self._max_tokens = DEFAULT_MAX_TOKENS

    def with_model(self, provider: str, model: str):
        # provider e' sempre "anthropic" nel codebase: lo ignoriamo e teniamo il modello.
        if model:
            self._model = model
        return self

    def with_max_tokens(self, max_tokens: int):
        if max_tokens:
            self._max_tokens = int(max_tokens)
        return self

    async def send_message(self, user_message) -> str:
        text = getattr(user_message, "text", None)
        if text is None:
            text = str(user_message)
        client = anthropic.AsyncAnthropic(api_key=_api_key(self._api_key))
        resp = await client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            system=self._system or "",
            messages=[{"role": "user", "content": text}],
        )
        return _extract_text(resp)
