"""
CRUD Operations Package
Contains database operations for all models
"""

# Chemical CRUD operations
from .chemical_crud import (
    get_chemical,
    get_chemical_by_inchikey, 
    get_chemical_by_cas,
    get_chemicals,
    search_chemicals_text,
    create_chemical,
    update_chemical,
    delete_chemical,
    get_chemicals_with_stock
)

# Stock CRUD operations
from .stock_crud import (
    get_stock,
    get_all_stock,
    update_stock, 
    check_low_stock_alert,
    get_active_alerts,
    resolve_alert,
    get_low_stock_chemicals,
    get_stock_summary
)

# MSDS CRUD operations
from .msds_crud import (
    get_msds_by_chemical_id,
    get_all_msds,
    create_msds,
    update_msds,
    delete_msds,
    fetch_msds_from_pubchem,
    get_or_fetch_msds,
    get_chemicals_without_msds,
    get_chemicals_with_msds,
    refresh_msds_data
)

__all__ = [
    # Chemical operations
    "get_chemical",
    "get_chemical_by_inchikey",
    "get_chemical_by_cas", 
    "get_chemicals",
    "search_chemicals_text",
    "create_chemical",
    "update_chemical",
    "delete_chemical",
    "get_chemicals_with_stock",
    
    # Stock operations
    "get_stock",
    "get_all_stock",
    "update_stock",
    "check_low_stock_alert",
    "get_active_alerts", 
    "resolve_alert",
    "get_low_stock_chemicals",
    "get_stock_summary",
    
    # MSDS operations
    "get_msds_by_chemical_id",
    "get_all_msds",
    "create_msds",
    "update_msds",
    "delete_msds",
    "fetch_msds_from_pubchem",
    "get_or_fetch_msds",
    "get_chemicals_without_msds",
    "get_chemicals_with_msds",
    "refresh_msds_data"
]