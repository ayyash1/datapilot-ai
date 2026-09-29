from pydantic import BaseModel, Field
from typing import Dict, Any
from app.agents.llm_provider import LLMProvider
import json

class EvaluationMetrics(BaseModel):
    accuracy_score: int = Field(description="Score from 0-100 indicating if the answer is factually correct based on the analysis.")
    groundedness_score: int = Field(description="Score from 0-100 indicating if the AI's claims are supported by the raw data.")
    hallucination_rate: int = Field(description="Score from 0-100 indicating likelihood of hallucinated details.")
    feedback: str = Field(description="Textual feedback for the AI response")

class EvaluatorAgent:
    @staticmethod
    def evaluate_response(user_query: str, analysis_results: Any, final_response: str) -> Dict[str, Any]:
        prompt = f"""
        You are an Evaluation AI. Grade the final response provided by the AI Data Analyst.
        User Query: {user_query}
        Raw Analysis Results (Facts): {json.dumps(analysis_results, default=str)}
        Final AI Response: {final_response}
        
        Provide scores for accuracy, groundedness, and hallucination.
        """
        try:
            result = LLMProvider.invoke_with_fallback(
                EvaluationMetrics,
                prompt_text=prompt,
                temperature=0,
            )
            return result.model_dump()
        except Exception as e:
            return {"error": str(e)}
