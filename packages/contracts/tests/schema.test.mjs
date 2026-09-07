import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createValidator, examplesRoot, loadJson } from "../scripts/contract-utils.mjs";

const validatorPromise = createValidator();

test("all schemas compile with unique canonical identifiers", async () => {
  const { ajv, schemas } = await validatorPromise;
  assert.equal(new Set(schemas.map(schema => schema.$id)).size, schemas.length);
  for (const schema of schemas) assert.doesNotThrow(() => ajv.compile(schema));
});

test("synthetic patient example validates", async () => {
  const { ajv } = await validatorPromise;
  const validate = ajv.getSchema("https://project-yoho.dev/contracts/1.0.0/examples/patient.schema.json");
  assert.equal(validate(await loadJson(path.join(examplesRoot, "patient.json"))), true);
});

test("patient contract rejects unknown fields and non-UTC timestamps", async () => {
  const { ajv } = await validatorPromise;
  const validate = ajv.getSchema("https://project-yoho.dev/contracts/1.0.0/examples/patient.schema.json");
  const example = await loadJson(path.join(examplesRoot, "patient.json"));
  assert.equal(validate({ ...example, absolutePath: "C:/patients/example.png" }), false);
  assert.equal(validate({ ...example, updatedAt: "2026-01-01T00:00:00+08:00" }), false);
});

test("sampling points use canonical JSON and reject undeclared fields", async () => {
  const { ajv } = await validatorPromise;
  const validate = ajv.getSchema("https://project-yoho.dev/contracts/1.0.0/domain/resources.schema.json#/$defs/samplePoint");
  assert.equal(validate({ xPixels: 32, yPixels: 24, kind: "foreground", sequence: 0 }), true);
  assert.equal(validate({ xPixels: 32, yPixels: 24, kind: "foreground", sequence: 0, picklePath: "samples.pkl" }), false);
});

test("error details allow bounded scalar diagnostics but not nested internals", async () => {
  const { ajv } = await validatorPromise;
  const validate = ajv.getSchema("https://project-yoho.dev/contracts/1.0.0/envelopes.schema.json#/$defs/error");
  const error = {
    code: "VALIDATION_FAILED",
    message: "The request is invalid.",
    details: { field: "displayCode", expectedRevision: 2 },
    retryable: false,
    correlationId: "corr_SYNTHETIC001"
  };
  assert.equal(validate(error), true);
  assert.equal(validate({ ...error, details: { stack: { file: "service.js" } } }), false);
});

test("worker request accepts artifact references and rejects paths", async () => {
  const { ajv } = await validatorPromise;
  const validate = ajv.getSchema("https://project-yoho.dev/contracts/1.0.0/envelopes.schema.json#/$defs/workerRequest");
  const example = await loadJson(path.join(examplesRoot, "worker-request.json"));
  assert.equal(validate(example), true);
  assert.equal(validate({ ...example, script: "train.py" }), false);
  assert.equal(validate({ ...example, inputs: [{ artifactId: example.inputs[0].artifactId, role: "dataset-manifest", path: "C:/data" }] }), false);
});

test("worker JSONL events validate and use a single terminal event", async () => {
  const { ajv } = await validatorPromise;
  const validate = ajv.getSchema("https://project-yoho.dev/contracts/1.0.0/envelopes.schema.json#/$defs/workerEvent");
  const lines = (await fs.readFile(path.join(examplesRoot, "worker-events.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(lines.every(event => validate(event)), true);
  assert.deepEqual(lines.map(event => event.sequence), [1, 2, 3, 4]);
  assert.equal(lines.filter(event => ["completed", "failed", "cancel-ack"].includes(event.event)).length, 1);
  assert.equal(validate({ ...lines[1], progressRatio: 1.1 }), false);
});
