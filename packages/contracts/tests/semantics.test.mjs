import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { stateTransitions, canTransition } from "../schema/domain/state-transitions.mjs";
import { loadJson } from "../scripts/contract-utils.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("completed annotation and task terminal states are immutable", () => {
  assert.deepEqual(stateTransitions.annotation.completed, []);
  for (const state of ["completed", "failed", "cancelled"]) assert.deepEqual(stateTransitions.task[state], []);
  assert.equal(canTransition("annotation", "draft", "completed"), true);
  assert.equal(canTransition("annotation", "completed", "draft"), false);
});

test("task cancellation and retry semantics remain explicit", () => {
  assert.equal(canTransition("task", "queued", "cancellation-requested"), true);
  assert.equal(canTransition("task", "running", "cancellation-requested"), true);
  assert.equal(canTransition("task", "cancellation-requested", "cancelled"), true);
  assert.equal(canTransition("task", "failed", "queued"), false);
});

test("every application operation maps to canonical IPC and HTTP adapters", async () => {
  const manifest = await loadJson(path.join(packageRoot, "schema", "api", "operation-manifest.json"));
  assert.equal(manifest.contractVersion, "1.0.0");
  assert.equal(new Set(manifest.operations.map(operation => operation.id)).size, manifest.operations.length);
  for (const operation of manifest.operations) {
    assert.match(operation.ipc.channel, /^[a-z][a-z-]*:[a-z][a-z-]*$/);
    assert.match(operation.http.path, /^\/api\/v1\//);
    assert.match(operation.schema, /^envelopes\.schema\.json#/);
  }
  const prohibited = manifest.operations.flatMap(operation => [operation.id, operation.ipc.channel]);
  assert.equal(prohibited.some(name => /readFile|saveFile|runPython|absolutePath/i.test(name)), false);
});
