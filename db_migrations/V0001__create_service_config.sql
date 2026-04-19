CREATE TABLE IF NOT EXISTS service_config (
    id          SERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    config_key   TEXT NOT NULL,
    config_value TEXT NOT NULL,
    updated_at   TIMESTAMP DEFAULT now(),
    UNIQUE (service_name, config_key)
);