from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.config import get_db
from app.models.dataset import Dataset, DatasetProfile
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.agents.graph import agent_executor
import json
import traceback

router = APIRouter()

class ChatRequest(BaseModel):
    dataset_id: int
    query: str

class ChatResponse(BaseModel):
    response: str
    agent_used: str
    code_generated: Optional[str] = None
    sql_generated: Optional[str] = None
    analysis_results: Optional[List[Any]] = None
    errors: Optional[List[str]] = None
    evaluation: Optional[Dict[str, Any]] = None

import os

@router.post("/", response_model=ChatResponse)
async def chat_with_data(req: ChatRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    
    # Fallback 1: If dataset ID not found, look for most recent dataset
    if not dataset:
        dataset = db.query(Dataset).order_by(Dataset.id.desc()).first()

    # Fallback 2: If database is empty on serverless container, use sample dataset
    sample_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/retail_transactions.csv"))
    if not dataset:
        if os.path.exists(sample_file):
            dataset = Dataset(
                id=req.dataset_id,
                filename="retail_transactions.csv",
                file_path=sample_file,
                size_bytes=os.path.getsize(sample_file),
                mime_type="text/csv"
            )
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
        else:
            raise HTTPException(status_code=404, detail="Dataset not found. Please upload a dataset first.")

    # Fallback 3: Check if dataset file exists on disk, fallback to sample file if missing
    file_path = dataset.file_path
    if not os.path.exists(file_path):
        if os.path.exists(sample_file):
            file_path = sample_file
        else:
            raise HTTPException(status_code=404, detail="Dataset file not found on disk. Please re-upload the file.")
        
    profile = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset.id).first()
    schema_info = profile.profile_data.get("columns", []) if (profile and profile.profile_data) else []
    
    # Initialize LangGraph state
    initial_state = {
        "session_id": "test_session",
        "dataset_id": dataset.id,
        "file_path": file_path,
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
            agent_used=final_state.get("agent_used") or "Unknown",
            code_generated=final_state.get("generated_code"),
            sql_generated=final_state.get("generated_sql"),
            analysis_results=final_state.get("analysis_results") if isinstance(final_state.get("analysis_results"), list) else None,
            errors=final_state.get("errors", []),
            evaluation=final_state.get("evaluation")
        )
    except Exception as e:
        print("ERROR IN GRAPH EXECUTION:")
        traceback.print_exc()
        return ChatResponse(
            response=f"Workflow error: {str(e)}. Please check your AI API key configuration in deployment settings.",
            agent_used="ERROR",
            errors=[str(e)]
        )
