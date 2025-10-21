from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import uvicorn
import os

from app.database import engine, get_db
from app.models import Base
from app.api import auth, chemicals, stock, msds, users

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartChemView API",
    description="Chemical Search, Structure Editing, and Stock Monitoring",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(chemicals.router, prefix="/chemicals", tags=["chemicals"])
app.include_router(stock.router, prefix="/stock", tags=["stock"])
app.include_router(msds.router, prefix="/msds", tags=["msds"])

@app.get("/")
async def root():
    return {"message": "SmartChemView API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)