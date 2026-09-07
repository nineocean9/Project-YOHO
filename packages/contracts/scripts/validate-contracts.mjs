import fs from "node:fs/promises";
import path from "node:path";
import { createValidator, examplesRoot, formatErrors, loadJson } from "./contract-utils.mjs";

const { ajv, schemas } = await createValidator();
for (const schema of schemas) ajv.compile(schema);

const examples = [
  ["patient.json", "https://project-yoho.dev/contracts/1.0.0/examples/patient.schema.json"],
  ["worker-request.json", "https://project-yoho.dev/contracts/1.0.0/envelopes.schema.json#/$defs/workerRequest"]
];

for (const [name, schemaId] of examples) {
  const validate = ajv.getSchema(schemaId);
  const value = await loadJson(path.join(examplesRoot, name));
  if (!validate(value)) throw new Error(`${name} is invalid: ${formatErrors(validate)}`);
}

const workerEvent = ajv.getSchema("https://project-yoho.dev/contracts/1.0.0/envelopes.schema.json#/$defs/workerEvent");
const lines = (await fs.readFile(path.join(examplesRoot, "worker-events.jsonl"), "utf8")).trim().split("\n");
for (const [index, line] of lines.entries()) {
  if (!workerEvent(JSON.parse(line))) throw new Error(`worker-events.jsonl:${index + 1} is invalid: ${formatErrors(workerEvent)}`);
}

console.log(`Validated ${schemas.length} schemas and ${examples.length + lines.length} examples.`);
