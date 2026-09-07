import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ArtifactStore } from "../src/index.mjs";

const owner = { ownerType: "image", ownerId: "image_11111111-1111-4111-8111-111111111111" };
const fixture = () => readFile(new URL("../../../tests/fixtures/generated/synthetic-geometric-rgb.png", import.meta.url));

async function setup(t) {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "yoho-artifacts-"));
  t.after(() => rm(rootDirectory, { recursive: true, force: true }));
  const store = new ArtifactStore({ rootDirectory, clock: () => new Date("2026-09-07T00:00:00.000Z") });
  await store.initialize();
  return { store, rootDirectory };
}

test("stages, commits, reads and soft-deletes verified content", async (t) => {
  const { store } = await setup(t);
  const content = await fixture();
  const staged = await store.stage({ ...owner, mediaType: "image/png", content });
  assert.equal((await store.commit(staged.artifactId, owner)).status, "available");
  assert.deepEqual((await store.read(staged.artifactId, owner)).content, content);
  assert.equal((await store.softDelete(staged.artifactId, owner)).status, "deleted");
  await assert.rejects(store.read(staged.artifactId, owner), { code: "RESOURCE_NOT_FOUND" });
  await store.purgeDeleted(staged.artifactId, owner);
});

test("rejects ownership mismatch without exposing a path", async (t) => {
  const { store, rootDirectory } = await setup(t);
  const staged = await store.stage({ ...owner, mediaType: "image/png", content: await fixture() });
  await assert.rejects(store.commit(staged.artifactId, { ownerType: "task", ownerId: "task_22222222-2222-4222-8222-222222222222" }), (error) => {
    assert.equal(error.code, "ARTIFACT_OWNERSHIP_VIOLATION");
    assert.equal(JSON.stringify(error).includes(rootDirectory), false);
    return true;
  });
});

test("rejects malformed content and owner type prefixes at the boundary", async (t) => {
  const { store } = await setup(t);
  await assert.rejects(store.stage({ ...owner, mediaType: "image/png", content: "not-bytes" }), { code: "VALIDATION_FAILED" });
  await assert.rejects(store.stage({ ownerType: "image", ownerId: "task_22222222-2222-4222-8222-222222222222", mediaType: "image/png", content: Buffer.alloc(0) }), { code: "VALIDATION_FAILED" });
});

test("quarantines content damaged before commit", async (t) => {
  const { store, rootDirectory } = await setup(t);
  const staged = await store.stage({ ...owner, mediaType: "image/png", content: await fixture() });
  await writeFile(path.join(rootDirectory, "staged", staged.artifactId, "data"), "damaged");
  await assert.rejects(store.commit(staged.artifactId, owner), { code: "WORKER_PROTOCOL_ERROR" });
  assert.equal(JSON.parse(await readFile(path.join(rootDirectory, "quarantine", staged.artifactId, "metadata.json"), "utf8")).status, "quarantined");
});
