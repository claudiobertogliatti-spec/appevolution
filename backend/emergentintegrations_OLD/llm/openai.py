"""
Shim per emergentintegrations.llm.openai
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)


class OpenAITextToSpeech:
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def generate_speech(
        self,
        text: str,
        model: str = "tts-1",
        voice: str = "alloy",
        speed: float = 1.0,
        response_format: str = "mp3",
    ) -> bytes:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.api_key)
        response = await client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            speed=speed,
            response_format=response_format,
        )
        return response.content


class _TranscriptionResponse:
    def __init__(self, segments):
        self.segments = segments


class OpenAISpeechToText:
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def transcribe(
        self,
        file: Any,
        model: str = "whisper-1",
        response_format: str = "verbose_json",
        language: str = None,
        timestamp_granularities: list = None,
    ) -> _TranscriptionResponse:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.api_key)
        kwargs = {
            "model": model,
            "file": file,
            "response_format": response_format,
        }
        if language:
            kwargs["language"] = language
        if timestamp_granularities:
            kwargs["timestamp_granularities"] = timestamp_granularities

        response = await client.audio.transcriptions.create(**kwargs)

        # Normalize segments
        raw_segments = getattr(response, "segments", None) or []
        return _TranscriptionResponse(segments=raw_segments)
