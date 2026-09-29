import os
import uuid
import shutil
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from app.database.config import get_db
from app.models.dataset import Dataset, DatasetProfile
from app.schemas.dataset import DatasetResponse, DatasetProfileResponse
from app.services.profiler import DataProfiler

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

def process_dataset_profile(dataset_id: int, file_path: str, db: Session):
    try:
        profile_result = DataProfiler.profile_dataset(file_path)
        
        profile = DatasetProfile(
            dataset_id=dataset_id,
            row_count=profile_result["row_count"],
            col_count=profile_result["col_count"],
            data_quality_score=profile_result["data_quality_score"],
            profile_data=profile_result["profile_data"]
        )
        db.add(profile)
        db.commit()
    except Exception as e:
        print(f"Error profiling dataset {dataset_id}: {e}")

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files are allowed.")
    
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_size = os.path.getsize(file_path)
    
    if file_size > 25 * 1024 * 1024:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 25MB.")

    db_dataset = Dataset(
        filename=file.filename,
        file_path=file_path,
        size_bytes=file_size,
        mime_type=file.content_type or "text/csv"
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    
    # Run profiling in background
    background_tasks.add_task(process_dataset_profile, db_dataset.id, file_path, db)
    
    return db_dataset

@router.get("/", response_model=list[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()

@router.get("/{dataset_id}/profile", response_model=DatasetProfileResponse)
def get_dataset_profile(dataset_id: int, db: Session = Depends(get_db)):
    profile = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found or still processing")
    return profile

@router.get("/{dataset_id}/data")
def get_dataset_data(
    dataset_id: int, 
    page: int = Query(1, ge=1), 
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found on disk")
        
    try:
        if dataset.file_path.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
            
        # Clean up NaN values which JSON cannot serialize
        df = df.fillna("")
        
        total_rows = len(df)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        
        paginated_df = df.iloc[start_idx:end_idx]
        
        return {
            "data": paginated_df.to_dict(orient="records"),
            "total_rows": total_rows,
            "page": page,
            "limit": limit,
            "total_pages": (total_rows + limit - 1) // limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

