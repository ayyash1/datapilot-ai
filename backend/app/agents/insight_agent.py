from app.agents.state import AgentState
from app.agents.llm_provider import LLMProvider
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import json

class InsightGeneration(BaseModel):
    insight: str = Field(description="The natural language explanation of the results")
    confidence: float = Field(description="Confidence in the insight (0-1)")

def insight_agent(state: AgentState) -> AgentState:
    llm = LLMProvider.get_llm(temperature=0.3).with_structured_output(InsightGeneration)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the Insight Agent. Your job is to explain analytical results in a clear, business-friendly manner.\n"
                   "Rules:\n"
                   "- Clearly distinguish facts (from the data) from hypotheses.\n"
                   "- Do not invent numbers. ONLY use the numbers from the analysis results provided.\n"
                   "- Be concise but informative.\n"
                   "Analysis Results (JSON): {analysis_results}\n"
                   "User query: {user_query}\n"
                   "Errors encountered (if any): {errors}"),
        ("human", "Generate the final explanation.")
    ])
    
    chain = prompt | llm
    
    try:
        res_str = json.dumps(state.get("analysis_results", {}), default=str)
        err_str = json.dumps(state.get("errors", []))
        result = chain.invoke({
            "analysis_results": res_str,
            "user_query": state["user_query"],
            "errors": err_str
        })
        
        state["insights"] = result.insight
        state["final_response"] = result.insight
        
    except Exception as e:
        state["errors"].append(f"Insight Agent error: {str(e)}")
        state["final_response"] = f"Sorry, I couldn't generate an insight. Errors: {state.get('errors')}"
        
    return state
