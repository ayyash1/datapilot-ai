from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import datasets, chat
from app.database.config import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DataPilot AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
