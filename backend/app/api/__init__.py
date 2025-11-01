"""
API Routes Package
Contains all FastAPI route modules for the SmartChemView application
"""

from . import auth, chemicals, stock, msds, users, reports

__all__ = ["auth", "chemicals", "stock", "msds", "users", "reports"]
