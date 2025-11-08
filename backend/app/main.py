from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text  # Import text for SQLAlchemy 2.0 compatibility
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import from current package using relative imports
from .database import engine, get_db
from .models import Base
from .api import auth, chemicals, stock, msds, users, reports, locations, barcodes, stock_adjustments
from .websocket import socket_app
from .api import molecular

# Create tables
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
except Exception as e:
    print(f"❌ Database table creation failed: {e}")

app = FastAPI(
    title="ReyChemIQ API",
    description="Smart Chemistry. Intelligent Inventory. - Chemical Inventory and Lab Management System",
    version="2.0.0",
    contact={
        "name": "ReyChemIQ Team",
        "email": "support@reychemiq.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    }
)
# Include molecular calculations router
app.include_router(molecular.router, prefix="/molecular", tags=["molecular-calculations"])

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(chemicals.router, prefix="/chemicals", tags=["chemicals"])
app.include_router(stock.router, prefix="/stock", tags=["stock"])
app.include_router(msds.router, prefix="/msds", tags=["msds"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(locations.router, prefix="/locations", tags=["locations"])
app.include_router(barcodes.router, prefix="/barcodes", tags=["barcodes"])
app.include_router(stock_adjustments.router, prefix="/stock-adjustments", tags=["stock-adjustments"])

# Mount WebSocket app
app.mount("/ws", socket_app)

@app.get("/")
async def root():
    return {
        "message": "ReyChemIQ API", 
        "version": "2.0.0",
        "tagline": "Smart Chemistry. Intelligent Inventory.",
        "developers": ["Mann", "Reyaan", "Vishal"],
        "company": "Invizone",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "ReyChemIQ API",
        "version": "2.0.0"
    }

# ADD THESE EXACT ENDPOINTS THAT YOUR FRONTEND EXPECTS:
@app.get("/api/health")
async def api_health_check():
    """Health check for frontend (matching frontend expectations)"""
    return {
        "status": "healthy", 
        "service": "ReyChemIQ API",
        "version": "2.0.0"
    }

@app.get("/api/database/health")
async def api_database_health(db: Session = Depends(get_db)):
    """Database health check for frontend"""
    try:
        # Test database connection with SQLAlchemy 2.0 compatible text()
        result = db.execute(text("SELECT 1"))
        return {
            "status": "healthy", 
            "service": "Database",
            "database_type": "SQLite" if "sqlite" in str(engine.url) else "MySQL",
            "system": "ReyChemIQ"
        }
    except Exception as e:
        return {"status": "error", "service": "Database", "error": str(e)}

@app.get("/api/auth/health")
async def api_auth_health():
    """Auth service health check for frontend"""
    return {
        "status": "healthy", 
        "service": "Auth",
        "system": "ReyChemIQ"
    }

@app.get("/test-db")
async def test_db_connection(db: Session = Depends(get_db)):
    """
    Test database connection
    """
    try:
        # Try to execute a simple query with SQLAlchemy 2.0 compatible text()
        result = db.execute(text("SELECT 1"))
        return {
            "database_status": "connected", 
            "test_query": "success",
            "database_type": "SQLite" if "sqlite" in str(engine.url) else "MySQL",
            "system": "ReyChemIQ"
        }
    except Exception as e:
        return {"database_status": "error", "error": str(e)}

@app.get("/test-auth")
async def test_auth_endpoint():
    """
    Test authentication endpoint
    """
    return {
        "message": "Auth endpoint is working", 
        "status": "success",
        "system": "ReyChemIQ"
    }

@app.get("/debug-db")
async def debug_database(db: Session = Depends(get_db)):
    try:
        # Check if users table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        tables = [row[0] for row in result]
        
        # Check if users table has data
        users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        
        # Check users table structure
        users_columns = []
        try:
            result = db.execute(text("PRAGMA table_info(users)"))
            users_columns = [{"name": row[1], "type": row[2]} for row in result]
        except:
            pass
        
        return {
            "system": "ReyChemIQ",
            "tables": tables,
            "users_table_exists": "users" in tables,
            "users_count": users_count,
            "users_columns": users_columns
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print("🚀 Starting ReyChemIQ Backend Server...")
    print("🏷️  Smart Chemistry. Intelligent Inventory.")
    print("👨‍💻 Developed by Mann, Reyaan & Vishal")
    print("🏢 Built by Invizone")
    print("📍 API Documentation: http://localhost:8000/docs")
    print("🔧 Health Check: http://localhost:8000/health")
    print("📊 Database Test: http://localhost:8000/test-db")
    print("🌐 Frontend Health Endpoints:")
    print("   - http://localhost:8000/api/health")
    print("   - http://localhost:8000/api/database/health")
    print("   - http://localhost:8000/api/auth/health")
    print("🔌 WebSocket available at: ws://localhost:8000/ws")
    
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )