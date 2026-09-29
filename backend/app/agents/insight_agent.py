from app.agents.state import AgentState
from app.agents.llm_provider import LLMProvider
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import json
import pandas as pd

class InsightGeneration(BaseModel):
    insight: str = Field(description="The natural language explanation of the results")
    confidence: float = Field(description="Confidence in the insight (0-1)")

def insight_agent(state: AgentState) -> AgentState:
    if not state.get("analysis_results"):
        try:
            file_path = state["file_path"]
            df = pd.read_csv(file_path) if file_path.lower().endswith(".csv") else pd.read_excel(file_path)
            numeric_columns = df.select_dtypes(include="number").columns.tolist()
            categorical_columns = df.select_dtypes(exclude="number").columns.tolist()
            fallback_results = {
                "row_count": len(df),
                "column_count": len(df.columns),
                "numeric_summary": df[numeric_columns].describe().round(2).to_dict() if numeric_columns else {},
                "top_values": {
                    column: df[column].value_counts(dropna=False).head(3).to_dict()
                    for column in categorical_columns[:8]
                },
            }
            state["analysis_results"] = fallback_results
        except Exception as error:
            state["errors"].append(f"Insight analysis fallback error: {type(error).__name__}: {error}")
            state["final_response"] = "I couldn't read this dataset to generate insights. Please verify the file and try again."
            return state

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the Insight Agent. Your job is to explain analytical results in a clear, business-friendly manner.\n"
                   "Rules:\n"
                   "- Clearly distinguish facts (from the data) from hypotheses.\n"
                   "- Do not invent numbers. ONLY use the numbers from the analysis results provided.\n"
                   "- Be concise but informative.\n"
                   "- Return exactly one structured response with an `insight` string and `confidence` number.\n"
                   "- If the user asks for multiple insights, put them as numbered points inside the single `insight` string; never return a JSON array.\n"
                   "Analysis Results (JSON): {analysis_results}\n"
                   "User query: {user_query}\n"
                   "Errors encountered (if any): {errors}"),
        ("human", "Generate the final explanation.")
    ])
    
    try:
        res_str = json.dumps(state.get("analysis_results", {}), default=str)
        err_str = json.dumps(state.get("errors", []))
        result = LLMProvider.invoke_with_fallback(
            InsightGeneration,
            prompt=prompt,
            values={
                "analysis_results": res_str,
                "user_query": state["user_query"],
                "errors": err_str,
            },
            temperature=0.3,
        )
        
        state["insights"] = result.insight
        state["final_response"] = result.insight
        
    except Exception as e:
        state["errors"].append(f"Insight Agent error: {str(e)}")
        state["final_response"] = f"Sorry, I couldn't generate an insight. Errors: {state.get('errors')}"
        
    return state
