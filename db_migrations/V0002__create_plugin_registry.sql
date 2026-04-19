CREATE TABLE IF NOT EXISTS plugin_registry (
    key         TEXT PRIMARY KEY,
    description TEXT NOT NULL DEFAULT '',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP DEFAULT now(),
    updated_at  TIMESTAMP DEFAULT now()
);