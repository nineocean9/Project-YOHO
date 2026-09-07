export const migrations = [
  {
    version: 1,
    name: "initial-data-foundation",
    up: `
      CREATE TABLE resources (
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision >= 1),
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (resource_type, resource_id)
      ) STRICT;
      CREATE TABLE artifacts (
        artifact_id TEXT PRIMARY KEY,
        owner_type TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
        sha256 TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('staged','available','quarantined','deleted')),
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX artifacts_owner_idx ON artifacts(owner_type, owner_id);
      CREATE TABLE import_runs (
        idempotency_key TEXT PRIMARY KEY,
        source_kind TEXT NOT NULL,
        report_json TEXT NOT NULL CHECK (json_valid(report_json)),
        imported_at TEXT NOT NULL
      ) STRICT;
    `,
    down: `DROP TABLE import_runs; DROP INDEX artifacts_owner_idx; DROP TABLE artifacts; DROP TABLE resources;`
  }
];
