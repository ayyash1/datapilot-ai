from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class DatasetBase(BaseModel):
    filename: str
    size_bytes: int
    mime_type: str

class DatasetCreate(DatasetBase):
    file_path: str

class DatasetResponse(DatasetBase):
    id: int
    uploaded_at: datetime

    class Config:
        from_attributes = True

class DatasetProfileResponse(BaseModel):
    id: int
    dataset_id: int
    row_count: int
    col_count: int
    data_quality_score: float
    profile_data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
