import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel
from typing import Any, Dict, Optional, Type
from pydantic import BaseModel

load_dotenv()

class LLMProvider:
    @staticmethod
    def get_llm(provider: str = "gemini", model: str = None, temperature: float = 0.0) -> BaseChatModel:
        # Graceful fallback logic
        gemini_key = os.getenv("GEMINI_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")
        
        if provider == "gemini" and gemini_key:
            return ChatGoogleGenerativeAI(
                model=model or "gemini-2.5-flash",
                temperature=temperature,
                google_api_key=gemini_key
            )
        elif provider == "groq" and groq_key:
            return ChatGroq(
                model=model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                temperature=temperature,
                groq_api_key=groq_key
            )
        elif gemini_key:
            return ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=temperature,
                google_api_key=gemini_key
            )
        elif groq_key:
            return ChatGroq(
                model="llama3-70b-8192",
                temperature=temperature,
                groq_api_key=groq_key
            )
        else:
            raise ValueError("No valid API keys found for GEMINI or GROQ.")

    @staticmethod
    def invoke_with_fallback(
        output_schema: Type[BaseModel],
        *,
        prompt: Any = None,
        values: Optional[Dict[str, Any]] = None,
        prompt_text: Optional[str] = None,
        temperature: float = 0.0,
    ) -> BaseModel:
        configured = {
            "groq": bool(os.getenv("GROQ_API_KEY")),
            "gemini": bool(os.getenv("GEMINI_API_KEY")),
        }
        preferred = os.getenv("LLM_PROVIDER", "groq").strip().lower()
        providers = [preferred, "gemini" if preferred == "groq" else "groq"]
        failures = []

        for provider in providers:
            if provider not in configured or not configured[provider]:
                continue
            try:
                llm = LLMProvider.get_llm(provider=provider, temperature=temperature)
                if provider == "groq":
                    structured_llm = llm.with_structured_output(output_schema, method="json_schema")
                else:
                    structured_llm = llm.with_structured_output(output_schema)
                if prompt is not None:
                    return (prompt | structured_llm).invoke(values or {})
                return structured_llm.invoke(prompt_text)
            except Exception as error:
                message = str(error).lower()
                if "429" in message or "quota" in message or "resource_exhausted" in message:
                    reason = "quota/rate limit exhausted"
                elif "401" in message or "403" in message or "unauthorized" in message or "invalid api key" in message:
                    reason = "credentials rejected"
                elif "404" in message or "model_not_found" in message or "decommissioned" in message:
                    reason = "model unavailable"
                else:
                    reason = f"request failed ({type(error).__name__})"
                failures.append(f"{provider}: {reason}")

        if not failures:
            raise ValueError("No LLM provider is configured. Set GROQ_API_KEY or GEMINI_API_KEY.")
        raise RuntimeError("All configured LLM providers failed: " + "; ".join(failures))
