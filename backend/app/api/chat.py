from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.config import get_db
from app.models.dataset import Dataset, DatasetProfile
from pydantic import BaseModel
from app.agents.graph import agent_executor
import json

router = APIRouter()

class ChatRequest(BaseModel):
    dataset_id: int
    query: str

class ChatResponse(BaseModel):
    response: str
    agent_used: str
    code_generated: str = None
    sql_generated: str = None
    analysis_results: list = None
    errors: list = None
    evaluation: dict = None

@router.post("/", response_model=ChatResponse)
async def chat_with_data(req: ChatRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    profile = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == req.dataset_id).first()
    schema_info = profile.profile_data.get("columns", []) if profile else []
    
    # Initialize LangGraph state
    initial_state = {
        "session_id": "test_session",
        "dataset_id": req.dataset_id,
        "file_path": dataset.file_path,
        "user_query": req.query,
        "schema_info": schema_info,
        "intent": None,
        "plan": [],
        "current_step": 0,
        "agent_used": None,
        "generated_code": None,
        "generated_sql": None,
        "analysis_results": None,
        "charts": [],
        "insights": None,
        "evaluation": {},
        "errors": [],
        "final_response": None
    }
    
    # Run graph
    try:
        final_state = agent_executor.invoke(initial_state)
        
        return ChatResponse(
            response=final_state.get("final_response") or "No response generated.",
            agent_used=final_state.get("agent_used", "Unknown"),
            code_generated=final_state.get("generated_code"),
            sql_generated=final_state.get("generated_sql"),
            analysis_results=final_state.get("analysis_results") if isinstance(final_state.get("analysis_results"), list) else None,
            errors=final_state.get("errors", []),
            evaluation=final_state.get("evaluation")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
