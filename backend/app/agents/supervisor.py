from app.agents.state import AgentState
from app.agents.llm_provider import LLMProvider
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import json

class SupervisorDecision(BaseModel):
    intent: str = Field(description="Summary of the user's intent")
    next_agent: str = Field(description="The next agent to route to. Options: 'python_analyst', 'sql_analyst', 'insight_agent' (if no code needed), 'FINISH'")
    reasoning: str = Field(description="Why this agent was chosen")

def supervisor_agent(state: AgentState) -> AgentState:
    llm = LLMProvider.get_llm(temperature=0).with_structured_output(SupervisorDecision)
    
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
    
    chain = prompt | llm
    
    try:
        schema_str = json.dumps(state.get("schema_info", {}))
        decision = chain.invoke({"schema_info": schema_str, "user_query": state["user_query"]})
        
        state["intent"] = decision.intent
        state["agent_used"] = decision.next_agent
        return state
    except Exception as e:
        state["errors"].append(f"Supervisor error: {str(e)}")
        state["agent_used"] = "FINISH"
        return state
