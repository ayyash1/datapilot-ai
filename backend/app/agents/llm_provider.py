import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel

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
                model=model or "llama3-70b-8192",
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
