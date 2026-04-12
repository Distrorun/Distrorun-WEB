-- DistroRun Registry Schema Migration
-- Run with: psql $DATABASE_URL -f scripts/migrate-registry.sql

-- Registry packages (one row per unique package name)
CREATE TABLE IF NOT EXISTS registry_packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    user_id TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    downloads INTEGER NOT NULL DEFAULT 0,
    latest_version INTEGER NOT NULL DEFAULT 1,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    official BOOLEAN NOT NULL DEFAULT FALSE,
    icon TEXT,
    icon_color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Package versions (one row per version — files stored in MinIO)
CREATE TABLE IF NOT EXISTS package_versions (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES registry_packages(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    yaml_key TEXT NOT NULL,           -- MinIO object key for YAML file
    sbom_key TEXT,                    -- MinIO object key for SBOM file (optional)
    base_distro TEXT NOT NULL DEFAULT 'alpine',
    packages TEXT[] NOT NULL DEFAULT '{}',
    services TEXT[] NOT NULL DEFAULT '{}',
    user_count INTEGER NOT NULL DEFAULT 0,
    sbom_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(package_id, version)
);

-- API tokens for CLI authentication
CREATE TABLE IF NOT EXISTS api_tokens (
    id SERIAL PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL DEFAULT '',
    user_name TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device codes for CLI login flow
CREATE TABLE IF NOT EXISTS device_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    user_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    token_hash TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add icon columns if missing
ALTER TABLE registry_packages ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE registry_packages ADD COLUMN IF NOT EXISTS icon_color TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registry_packages_user ON registry_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_registry_packages_name ON registry_packages(name);
CREATE INDEX IF NOT EXISTS idx_package_versions_package ON package_versions(package_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_codes_code ON device_codes(code);
CREATE INDEX IF NOT EXISTS idx_device_codes_status ON device_codes(status);
