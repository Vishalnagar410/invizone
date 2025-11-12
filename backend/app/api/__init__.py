"""
API Routes Package
Contains all FastAPI route modules for the ReyChemIQ application
"""

from . import chemicals, stock, msds, users, reports, locations, barcodes, stock_adjustments

# Conditionally include auth if it exists
try:
    from . import auth
    __all__ = ["auth", "chemicals", "stock", "msds", "users", "reports", "locations", "barcodes", "stock_adjustments"]
    print("✅ Auth API routes included")
except ImportError:
    __all__ = ["chemicals", "stock", "msds", "users", "reports", "locations", "barcodes", "stock_adjustments"]
    print("⚠️  Auth API routes not found")