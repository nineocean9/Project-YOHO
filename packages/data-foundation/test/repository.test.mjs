import assert from "node:assert/strict";
import test from "node:test";
import { SqliteRepository } from "../src/index.mjs";

const patientId = "patient_11111111-1111-4111-8111-111111111111";
const patient = { displayCode: "SYN-001", status: "active" };

test("migrates, persists metadata and enforces optimistic revision", (t) => {
  const repository = new SqliteRepository({ clock: () => new Date("2026-09-07T00:00:00.000Z") });
  t.after(() => repository.close());
  assert.equal(repository.initialize(), 1);
  const created = repository.createResource("patient", patientId, patient);
  assert.equal(created.revision, 1);
  assert.equal(created.patientId, patientId);
  assert.equal(repository.updateResource("patient", patientId, 1, { status: "archived" }).revision, 2);
  assert.throws(() => repository.updateResource("patient", patientId, 1, { status: "active" }), { code: "CONFLICT" });
  assert.equal(repository.getResource("patient", patientId).status, "archived");
});

test("rejects a payload whose canonical ID disagrees with the repository key", (t) => {
  const repository = new SqliteRepository();
  t.after(() => repository.close());
  repository.initialize();
  assert.throws(() => repository.createResource("patient", patientId, { ...patient, patientId: "patient_22222222-2222-4222-8222-222222222222" }), { code: "VALIDATION_FAILED" });
});

test("legacy import is repeatable and never deletes records absent from a snapshot", (t) => {
  const repository = new SqliteRepository();
  t.after(() => repository.close());
  repository.initialize();
  repository.createResource("patient", patientId, patient);
  const importedId = "patient_22222222-2222-4222-8222-222222222222";
  const request = { sourceKind: "local-storage", idempotencyKey: "legacy:fixture:001", resources: [{ resourceType: "patient", resourceId: importedId, payload: { displayCode: "SYN-002", status: "active" } }] };
  assert.deepEqual(repository.importLegacy(request), { sourceKind: "local-storage", idempotencyKey: "legacy:fixture:001", imported: 1, skipped: 0, errors: [], deleted: 0, repeated: false });
  assert.equal(repository.importLegacy(request).repeated, true);
  assert.equal(repository.getResource("patient", patientId).displayCode, "SYN-001");
});

test("migration failure rolls back the entire migration", (t) => {
  const broken = [{ version: 1, name: "broken", up: "CREATE TABLE partial(id INTEGER); INVALID SQL;", down: "DROP TABLE partial;" }];
  const repository = new SqliteRepository({ migrationSet: broken });
  t.after(() => repository.close());
  assert.throws(() => repository.initialize(), { code: "INTERNAL_ERROR" });
  assert.equal(repository.migrations.currentVersion(), 0);
  assert.equal(repository.database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name = 'partial'").get().count, 0);
});

test("successful migration can be explicitly rolled back", (t) => {
  const repository = new SqliteRepository();
  t.after(() => repository.close());
  repository.initialize();
  assert.equal(repository.rollback(0), 0);
  assert.equal(repository.database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name = 'resources'").get().count, 0);
});
