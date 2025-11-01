import requests
import json

BASE_URL = "http://localhost:8000"

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Backend not reachable: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    try:
        response = requests.get(f"{BASE_URL}/test-db")
        print(f"✅ Database test: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_user_registration():
    """Test user registration directly"""
    user_data = {
        "email": "test@lab.com",
        "password": "test123",
        "full_name": "Test User",
        "role": "admin"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        print(f"✅ Registration test: {response.status_code}")
        if response.status_code == 200:
            print(f"   User created: {response.json()}")
        else:
            print(f"   Error: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Registration failed: {e}")
        return False

def test_user_login():
    """Test user login directly"""
    login_data = {
        "username": "test@lab.com",
        "password": "test123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"✅ Login test: {response.status_code}")
        if response.status_code == 200:
            print(f"   Login successful: {response.json()}")
        else:
            print(f"   Error: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing Backend Connection...")
    print("=" * 50)
    
    # Run tests
    health_ok = test_backend_health()
    db_ok = test_database_connection()
    
    if health_ok and db_ok:
        print("\n🔍 Testing Authentication...")
        reg_ok = test_user_registration()
        if reg_ok:
            login_ok = test_user_login()
        
    print("=" * 50)
    print("🎯 Backend Test Complete")