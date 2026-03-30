"""
Shim per emergentintegrations.llm.chat
Sostituisce la libreria privata di Emergent con Anthropic SDK nativo.
"""
import os
import logging

logger = logging.getLogger(__name__)


class UserMessage:
    def __init__(self, text=None, content=None):
        self.text = text or content or ""


class LlmChat:
    def __init__(self, api_key: str, session_id: str = "", system_message: str = ""):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self._provider = "anthropic"
        self._model = "claude-sonnet-4-6"
        self._messages = []

    def with_model(self, provider: str, model: str):
        self._provider = provider.lower()
        self._model = model
        return self

    async def send_message(self, msg: UserMessage) -> str:
        text = msg.text or msg.content if hasattr(msg, 'content') else msg.text
        if not text:
            text = ""

        self._messages.append({"role": "user", "content": text})

        try:
            result = await self._call_api()
        except Exception as e:
            logger.error(f"LlmChat error (provider={self._provider}, model={self._model}): {e}")
            raise

        self._messages.append({"role": "assistant", "content": result})
        return result

    async def _call_api(self) -> str:
        if self._provider == "anthropic":
            return await self._call_anthropic()
        elif self._provider in ("openai", "gpt"):
            return await self._call_openai()
        elif self._provider in ("google", "gemini"):
            return await self._call_google()
        else:
            # Fallback to anthropic
            return await self._call_anthropic()

    async def _call_anthropic(self) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        kwargs = {
            "model": self._model,
            "max_tokens": 8096,
            "messages": self._messages,
        }
        if self.system_message:
            kwargs["system"] = self.system_message

        response = await client.messages.create(**kwargs)
        return response.content[0].text

    async def _call_openai(self) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.api_key)
        messages = []
        if self.system_message:
            messages.append({"role": "system", "content": self.system_message})
        messages.extend(self._messages)
        response = await client.chat.completions.create(
            model=self._model,
            messages=messages,
            max_tokens=8096,
        )
        return response.choices[0].message.content

    async def _call_google(self) -> str:
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(
            model_name=self._model,
            system_instruction=self.system_message or None,
        )
        history = []
        for m in self._messages[:-1]:
            role = "user" if m["role"] == "user" else "model"
            history.append({"role": role, "parts": [m["content"]]})
        chat = model.start_chat(history=history)
        response = await chat.send_message_async(self._messages[-1]["content"])
        return response.text
