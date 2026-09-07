import { DatabaseSync } from "node:sqlite";
import { fail } from "./errors.mjs";
import { MigrationRunner } from "./migration-runner.mjs";
import { migrations } from "./migrations.mjs";

const RESOURCE_TYPES = new Set(["patient", "examination", "image", "annotation", "dataset", "model", "prediction", "task", "audit", "user", "role"]);
const ID_FIELDS = {
  patient: "patientId", examination: "examinationId", image: "imageId", annotation: "annotationVersionId",
  dataset: "datasetVersionId", model: "modelVersionId", prediction: "predictionResultId", task: "taskId",
  audit: "auditEventId", user: "userId", role: "roleId"
};

export class SqliteRepository {
  constructor({ databasePath = ":memory:", clock = () => new Date(), migrationSet = migrations } = {}) {
    this.database = new DatabaseSync(databasePath);
    this.database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000");
    this.clock = clock;
    this.migrations = new MigrationRunner(this.database, migrationSet);
  }

  initialize() { return this.migrations.migrate(); }
  rollback(targetVersion = 0) { return this.migrations.migrate(targetVersion); }
  close() { this.database.close(); }

  createResource(resourceType, resourceId, payload) {
    this.#assertResource(resourceType, resourceId);
    const now = this.clock().toISOString();
    const idField = ID_FIELDS[resourceType];
    if (payload[idField] && payload[idField] !== resourceId) fail("VALIDATION_FAILED", "Resource payload ID does not match.", { resourceType, resourceId });
    const resource = { ...payload, [idField]: resourceId, revision: 1, createdAt: payload.createdAt ?? now, updatedAt: now };
    try {
      this.database.prepare("INSERT INTO resources(resource_type, resource_id, revision, status, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(resourceType, resourceId, 1, resource.status, JSON.stringify(resource), resource.createdAt, resource.updatedAt);
    } catch (error) {
      if (String(error.message).includes("UNIQUE")) fail("CONFLICT", "Resource already exists.", { resourceType, resourceId });
      throw error;
    }
    return resource;
  }

  getResource(resourceType, resourceId) {
    this.#assertResource(resourceType, resourceId);
    const row = this.database.prepare("SELECT payload_json FROM resources WHERE resource_type = ? AND resource_id = ?").get(resourceType, resourceId);
    if (!row) fail("RESOURCE_NOT_FOUND", "Resource was not found.", { resourceType, resourceId });
    return JSON.parse(row.payload_json);
  }

  updateResource(resourceType, resourceId, expectedRevision, changes) {
    const current = this.getResource(resourceType, resourceId);
    const next = { ...current, ...changes, revision: current.revision + 1, updatedAt: this.clock().toISOString() };
    const result = this.database.prepare("UPDATE resources SET revision = ?, status = ?, payload_json = ?, updated_at = ? WHERE resource_type = ? AND resource_id = ? AND revision = ?")
      .run(next.revision, next.status, JSON.stringify(next), next.updatedAt, resourceType, resourceId, expectedRevision);
    if (result.changes !== 1) fail("CONFLICT", "Resource revision does not match.", { resourceType, resourceId, expectedRevision, actualRevision: current.revision });
    return next;
  }

  saveArtifact(artifact) {
    this.database.prepare(`INSERT INTO artifacts(artifact_id, owner_type, owner_id, media_type, size_bytes, sha256, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(artifact_id) DO UPDATE SET status = excluded.status
      WHERE artifacts.owner_type = excluded.owner_type AND artifacts.owner_id = excluded.owner_id AND artifacts.sha256 = excluded.sha256`)
      .run(artifact.artifactId, artifact.ownerType, artifact.ownerId, artifact.mediaType, artifact.sizeBytes, artifact.sha256, artifact.status, artifact.createdAt);
    return this.getArtifact(artifact.artifactId, { ownerType: artifact.ownerType, ownerId: artifact.ownerId });
  }

  getArtifact(artifactId, owner) {
    const row = this.database.prepare("SELECT * FROM artifacts WHERE artifact_id = ?").get(artifactId);
    if (!row) fail("RESOURCE_NOT_FOUND", "Artifact metadata was not found.", { artifactId });
    if (row.owner_type !== owner.ownerType || row.owner_id !== owner.ownerId) fail("ARTIFACT_OWNERSHIP_VIOLATION", "Artifact does not belong to the requested resource.", { artifactId });
    return { artifactId: row.artifact_id, ownerType: row.owner_type, ownerId: row.owner_id, mediaType: row.media_type, sizeBytes: row.size_bytes, sha256: row.sha256, status: row.status, createdAt: row.created_at };
  }

  importLegacy({ sourceKind, idempotencyKey, resources }) {
    const previous = this.database.prepare("SELECT report_json FROM import_runs WHERE idempotency_key = ?").get(idempotencyKey);
    if (previous) return { ...JSON.parse(previous.report_json), repeated: true };
    const report = { sourceKind, idempotencyKey, imported: 0, skipped: 0, errors: [], deleted: 0, repeated: false };
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const item of resources) {
        const exists = this.database.prepare("SELECT 1 FROM resources WHERE resource_type = ? AND resource_id = ?").get(item.resourceType, item.resourceId);
        if (exists) { report.skipped += 1; continue; }
        try { this.createResource(item.resourceType, item.resourceId, item.payload); report.imported += 1; }
        catch (error) { report.errors.push({ resourceType: item.resourceType, resourceId: item.resourceId, code: error.code ?? "INTERNAL_ERROR" }); }
      }
      this.database.prepare("INSERT INTO import_runs(idempotency_key, source_kind, report_json, imported_at) VALUES (?, ?, ?, ?)")
        .run(idempotencyKey, sourceKind, JSON.stringify(report), this.clock().toISOString());
      this.database.exec("COMMIT");
      return report;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  #assertResource(resourceType, resourceId) {
    if (!RESOURCE_TYPES.has(resourceType) || typeof resourceId !== "string" || !resourceId.startsWith(`${resourceType}_`)) fail("VALIDATION_FAILED", "Resource identity is invalid.", { resourceType });
  }
}
