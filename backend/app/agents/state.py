from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel

class AgentState(TypedDict):
    session_id: str
    dataset_id: int
    file_path: str
    user_query: str
    schema_info: Dict[str, Any]
    
    intent: Optional[str]
    plan: List[str]
    current_step: int
    
    agent_used: Optional[str]
    generated_code: Optional[str]
    generated_sql: Optional[str]
    
    analysis_results: Optional[Any]
    charts: List[Dict[str, Any]]
    insights: Optional[str]
    
    evaluation: Dict[str, Any]
    errors: List[str]
    final_response: Optional[str]
