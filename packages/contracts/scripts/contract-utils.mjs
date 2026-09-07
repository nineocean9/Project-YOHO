import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const schemaRoot = path.join(packageRoot, "schema");
export const examplesRoot = path.join(packageRoot, "examples");

export async function walk(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target, extension));
    else if (entry.name.endsWith(extension)) files.push(target);
  }
  return files.sort();
}

export async function loadJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

export async function createValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: false });
  ajv.addKeyword({ keyword: "x-privacy-class", schemaType: "string", valid: true });
  addFormats(ajv);
  const files = await walk(schemaRoot, ".json");
  const documents = await Promise.all(files.map(loadJson));
  const schemas = documents.filter(document => typeof document.$schema === "string");
  for (const schema of schemas) ajv.addSchema(schema);
  return { ajv, schemas, files };
}

export function formatErrors(validate) {
  return JSON.stringify(validate.errors, null, 2);
}
