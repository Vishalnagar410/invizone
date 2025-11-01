import sys
import os
import uvicorn

def main():
    print("🔧 Starting SmartChemView Backend Server...")
    
    # Add current directory to Python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    try:
        # Check if required modules exist
        from app.main import app
        from app.database import engine
        from app.models import Base
        
        print("✅ All modules imported successfully")
        print("✅ Database engine created")
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
        
        # Start server
        print("🚀 Starting Uvicorn server...")
        print("📍 Local: http://localhost:8000")
        print("📚 Docs: http://localhost:8000/docs")
        print("❤️ Health: http://localhost:8000/health")
        
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please check your file structure and imports")
    except Exception as e:
        print(f"❌ Server startup error: {e}")
        print("Check the error above and fix the issue")

if __name__ == "__main__":
    main()