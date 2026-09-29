from app.agents.state import AgentState
from app.agents.llm_provider import LLMProvider
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import json
import re

class SupervisorDecision(BaseModel):
    intent: str = Field(description="Summary of the user's intent")
    next_agent: str = Field(description="The next agent to route to. Options: 'python_analyst', 'sql_analyst', 'insight_agent' (if no code needed), 'FINISH'")
    reasoning: str = Field(description="Why this agent was chosen")

def supervisor_agent(state: AgentState) -> AgentState:
    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are the Supervisor Agent for DataPilot AI. "
                       "Your job is to understand the user's question about a dataset and decide the best tool to use.\n"
                       "Available tools/agents:\n"
                       "- python_analyst: Best for complex statistical analysis, machine learning, or complex Pandas operations.\n"
                       "- sql_analyst: Best for standard aggregations, GROUP BY, counting, joining, filtering (DuckDB).\n"
                       "- insight_agent: Use this if the user is just asking a general question that does not require calculating new numbers.\n"
                       "\nDataset Schema: {schema_info}"),
            ("human", "User query: {user_query}")
        ])
        schema_str = json.dumps(state.get("schema_info", {}))
        decision = LLMProvider.invoke_with_fallback(
            SupervisorDecision,
            prompt=prompt,
            values={"schema_info": schema_str, "user_query": state["user_query"]},
            temperature=0,
        )
        
        state["intent"] = decision.intent
        next_agent = decision.next_agent
        query = state["user_query"].lower()
        broad_insight_terms = ("insights?", "trends?", "patterns?", "overview", "summari[sz]e", "summaries")
        complex_analysis_terms = ("correlation", "regression", "forecast", "machine learning", "predict")
        asks_for_broad_insights = (
            any(re.search(rf"\b(?:{term})\b", query) for term in broad_insight_terms)
            and not any(term in query for term in complex_analysis_terms)
        )
        if not state.get("analysis_results") and (next_agent == "insight_agent" or asks_for_broad_insights):
            next_agent = "sql_analyst"
        state["agent_used"] = next_agent
        return state
    except Exception as e:
        state["errors"].append(f"Supervisor error: {str(e)}")
        state["agent_used"] = "FINISH"
        state["final_response"] = "I couldn't determine how to analyze this dataset. Please try rephrasing your question."
        return state
