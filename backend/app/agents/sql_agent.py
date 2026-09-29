from app.agents.state import AgentState
from app.agents.llm_provider import LLMProvider
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import duckdb
import pandas as pd
import json

class SQLGeneration(BaseModel):
    sql_query: str = Field(description="The DuckDB compatible SQL query to execute")
    reasoning: str = Field(description="Explanation of the query")

def sql_analyst_agent(state: AgentState) -> AgentState:
    if state["agent_used"] != "sql_analyst":
        return state
        
    llm = LLMProvider.get_llm(temperature=0).with_structured_output(SQLGeneration)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the SQL Analyst Agent. Your job is to generate a DuckDB SQL query to answer the user's question.\n"
                   "The dataset is loaded into a table named 'dataset'.\n"
                   "Rules:\n"
                   "- Only use SELECT statements.\n"
                   "- Do not use UPDATE, DELETE, INSERT, DROP.\n"
                   "- Dataset Schema: {schema_info}"),
        ("human", "User query: {user_query}")
    ])
    
    chain = prompt | llm
    
    try:
        schema_str = json.dumps(state.get("schema_info", {}))
        result = chain.invoke({"schema_info": schema_str, "user_query": state["user_query"]})
        
        sql_query = result.sql_query
        
        # Security: Prevent destructive operations (basic check)
        if any(keyword in sql_query.upper() for keyword in ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER"]):
            raise ValueError("Destructive SQL operations are not allowed.")
            
        state["generated_sql"] = sql_query
        
        # Execute DuckDB
        file_path = state["file_path"]
        
        con = duckdb.connect(database=':memory:')
        
        # Load data based on file type
        if file_path.endswith('.csv'):
            try:
                con.execute(f"CREATE TABLE dataset AS SELECT * FROM read_csv_auto('{file_path}')")
            except Exception:
                df = pd.read_csv(file_path)
                con.register('dataset', df)
        elif file_path.endswith('.xlsx'):
            # DuckDB doesn't natively read excel well without extensions, use pandas for simplicity
            df = pd.read_excel(file_path)
            con.register('dataset', df)
            
        query_result = con.execute(sql_query).df()
        state["analysis_results"] = query_result.to_dict(orient="records")
        con.close()
        
    except Exception as e:
        state["errors"].append(f"SQL Agent error: {str(e)}")
        
    return state
