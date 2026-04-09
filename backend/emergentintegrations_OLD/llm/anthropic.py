"""
Shim per emergentintegrations.llm.anthropic
"""
import logging

logger = logging.getLogger(__name__)


class AnthropicClient:
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def generate(self, prompt: str, model: str = "claude-sonnet-4-6", max_tokens: int = 8000) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
