"""
Utility Functions Package
Contains helper functions and utilities for the application
"""
from .chemical_utils import (
    canonicalize_smiles,
    generate_inchikey,
    calculate_molecular_properties,
    validate_chemical_structure,
    generate_unique_id,
    generate_barcode,
    process_chemical_data,
    generate_chemical_qr_data,
    generate_location_string,
    validate_storage_condition,
    calculate_stock_status,
    calculate_properties_in_background,
    estimate_cas_from_smiles,
    validate_and_suggest_name,
    generate_compound_summary,
    get_calculation_progress
)

from .notifications import (
    NotificationService,
    notification_service,
    check_and_notify_low_stock,
    send_daily_stock_report
)

__all__ = [
    # Chemical utilities
    "canonicalize_smiles",
    "generate_inchikey", 
    "calculate_molecular_properties",
    "validate_chemical_structure",
    "generate_unique_id",
    "generate_barcode",
    "process_chemical_data",
    "generate_chemical_qr_data",
    "generate_location_string",
    "validate_storage_condition",
    "calculate_stock_status",
    "calculate_properties_in_background",
    "estimate_cas_from_smiles",
    "validate_and_suggest_name",
    "generate_compound_summary",
    "get_calculation_progress",
    
    # Notification utilities
    "NotificationService",
    "notification_service",
    "check_and_notify_low_stock",
    "send_daily_stock_report"
]