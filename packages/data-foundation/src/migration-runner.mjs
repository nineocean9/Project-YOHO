import { fail } from "./errors.mjs";

export class MigrationRunner {
  constructor(database, migrationSet) {
    this.database = database;
    this.migrations = [...migrationSet].sort((a, b) => a.version - b.version);
    this.database.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT");
  }

  currentVersion() {
    return this.database.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get().version;
  }

  migrate(targetVersion = this.migrations.at(-1)?.version ?? 0) {
    const current = this.currentVersion();
    if (targetVersion === current) return current;
    const steps = targetVersion > current
      ? this.migrations.filter((item) => item.version > current && item.version <= targetVersion)
      : [...this.migrations].filter((item) => item.version <= current && item.version > targetVersion).reverse();
    if (steps.length !== Math.abs(targetVersion - current)) fail("VALIDATION_FAILED", "Migration target is unavailable.", { targetVersion });
    for (const migration of steps) this.#apply(migration, targetVersion > current);
    return this.currentVersion();
  }

  #apply(migration, forward) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.exec(forward ? migration.up : migration.down);
      if (forward) this.database.prepare("INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)").run(migration.version, migration.name, new Date().toISOString());
      else this.database.prepare("DELETE FROM schema_migrations WHERE version = ?").run(migration.version);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      fail("INTERNAL_ERROR", "Database migration failed and was rolled back.", { version: migration.version });
    }
  }
}
