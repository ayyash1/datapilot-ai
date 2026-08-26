from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.supervisor import supervisor_agent
from app.agents.python_agent import python_analyst_agent
from app.agents.sql_agent import sql_analyst_agent
from app.agents.insight_agent import insight_agent
from app.agents.evaluator import EvaluatorAgent

def evaluation_agent(state: AgentState) -> AgentState:
    if state.get("final_response") and state.get("analysis_results"):
        eval_metrics = EvaluatorAgent.evaluate_response(
            state["user_query"], 
            state["analysis_results"], 
            state["final_response"]
        )
        state["evaluation"] = eval_metrics
    return state

def create_agent_graph():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("supervisor", supervisor_agent)
    workflow.add_node("python_analyst", python_analyst_agent)
    workflow.add_node("sql_analyst", sql_analyst_agent)
    workflow.add_node("insight_agent", insight_agent)
    workflow.add_node("evaluation_agent", evaluation_agent)
    
    # Edge logic
    def route_from_supervisor(state: AgentState):
        agent = state.get("agent_used")
        if agent == "python_analyst":
            return "python_analyst"
        elif agent == "sql_analyst":
            return "sql_analyst"
        elif agent == "insight_agent":
            return "insight_agent"
        else:
            return END
            
    # Add edges
    workflow.add_edge(START, "supervisor")
    
    workflow.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "python_analyst": "python_analyst",
            "sql_analyst": "sql_analyst",
            "insight_agent": "insight_agent",
            END: END
        }
    )
    
    workflow.add_edge("python_analyst", "insight_agent")
    workflow.add_edge("sql_analyst", "insight_agent")
    workflow.add_edge("insight_agent", "evaluation_agent")
    workflow.add_edge("evaluation_agent", END)
    
    return workflow.compile()

agent_executor = create_agent_graph()
