from app.agents.state import AgentState
from app.agents.llm_provider import LLMProvider
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import json
import traceback

class PythonGeneration(BaseModel):
    python_code: str = Field(description="The Python code to execute. Must define a function `analyze(df: pd.DataFrame) -> dict` or return a list of dicts.")
    reasoning: str = Field(description="Explanation of the code")

def python_analyst_agent(state: AgentState) -> AgentState:
    if state["agent_used"] != "python_analyst":
        return state
        
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the Python Analyst Agent. Generate Python code using pandas to analyze a dataset.\n"
                   "Rules:\n"
                   "- The code MUST define a function named `analyze` that takes a pandas DataFrame `df` as input.\n"
                   "- The function MUST return a list of dictionaries (e.g. `return df.to_dict(orient='records')`) or a single dictionary.\n"
                   "- Do not include any imports outside the function if they are malicious, standard pandas is available as `pd` and NumPy as `np`.\n"
                   "- Do not read or write files.\n"
                   "- Dataset Schema: {schema_info}"),
        ("human", "User query: {user_query}")
    ])
    
    try:
        schema_str = json.dumps(state.get("schema_info", {}))
        result = LLMProvider.invoke_with_fallback(
            PythonGeneration,
            prompt=prompt,
            values={"schema_info": schema_str, "user_query": state["user_query"]},
            temperature=0.1,
        )
        
        python_code = result.python_code
        state["generated_code"] = python_code
        
        # Load dataset
        file_path = state["file_path"]
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        # Secure execution environment
        local_env = {"pd": pd, "np": np}
        # Execute definition
        exec(python_code, {"pd": pd, "np": np}, local_env)
        
        if "analyze" not in local_env:
            raise ValueError("The generated code did not define an `analyze` function.")
            
        analyze_func = local_env["analyze"]
        analysis_result = analyze_func(df)
        
        # Handle nan values in result to be JSON compliant
        if isinstance(analysis_result, pd.DataFrame):
            analysis_result = analysis_result.to_dict(orient="records")
            
        state["analysis_results"] = analysis_result
        
    except Exception as e:
        state["errors"].append(f"Python Agent error: {str(e)}\n{traceback.format_exc()}")
        
    return state
