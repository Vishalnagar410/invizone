-- Enhanced Locations Table with Hierarchy and Storage Conditions
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    lab_name VARCHAR(100),
    room VARCHAR(100),
    shelf VARCHAR(100),
    rack VARCHAR(100),
    position VARCHAR(100),
    storage_conditions VARCHAR(100), -- RT, 2-8°C, -20°C, -80°C, Custom
    custom_storage_condition VARCHAR(100),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Barcode Images Table
CREATE TABLE IF NOT EXISTS barcode_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chemical_id INTEGER NOT NULL,
    barcode_type VARCHAR(20) NOT NULL, -- 'code128' or 'qr'
    barcode_data TEXT NOT NULL,
    image_blob BLOB,
    image_path VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chemical_id) REFERENCES chemicals(id) ON DELETE CASCADE
);

-- Stock Adjustments Table for Audit Trail
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chemical_id INTEGER NOT NULL,
    admin_id INTEGER NOT NULL,
    before_quantity FLOAT NOT NULL,
    after_quantity FLOAT NOT NULL,
    change_amount FLOAT NOT NULL,
    reason VARCHAR(50) NOT NULL, -- Usage, Spillage, Received, Correction, Transfer, Expired, Other
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chemical_id) REFERENCES chemicals(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update Chemicals Table to reference locations
ALTER TABLE chemicals ADD COLUMN location_id INTEGER REFERENCES locations(id);

-- Create indexes for better performance
CREATE INDEX idx_locations_hierarchy ON locations(department, lab_name, room, shelf, rack);
CREATE INDEX idx_barcode_images_chemical ON barcode_images(chemical_id);
CREATE INDEX idx_stock_adjustments_chemical ON stock_adjustments(chemical_id);
CREATE INDEX idx_stock_adjustments_timestamp ON stock_adjustments(timestamp);

-- Insert predefined storage conditions
INSERT INTO locations (name, department, lab_name, room, shelf, rack, position, storage_conditions) VALUES
('Room Temp Storage', 'Chemistry', 'Main Lab', 'Lab 101', 'Storage Shelf', 'Rack A', 'Position 1', 'RT'),
('Cold Room 4C', 'Biology', 'Cell Culture Lab', 'Cold Room', 'Shelf 1', 'Rack B', 'Position 2', '2-8°C'),
('Freezer -20C', 'Biochemistry', 'Protein Lab', 'Freezer Room', 'Shelf 2', 'Rack C', 'Position 3', '-20°C'),
('Ultra Low -80C', 'Molecular Biology', 'DNA Lab', 'Freezer Room', 'Shelf 3', 'Rack D', 'Position 4', '-80°C');