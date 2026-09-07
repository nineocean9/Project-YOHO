import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fail } from "./errors.mjs";

const OWNER_TYPES = new Set(["patient", "examination", "image", "annotation", "dataset", "model", "prediction", "report", "task"]);
const OPAQUE_ID = /^[a-z][a-z0-9]*_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function assertOwner(ownerType, ownerId) {
  if (!OWNER_TYPES.has(ownerType) || !OPAQUE_ID.test(ownerId) || !ownerId.startsWith(`${ownerType}_`)) fail("VALIDATION_FAILED", "Artifact owner is invalid.", { fields: ["ownerType", "ownerId"] });
}

function digest(content) {
  return createHash("sha256").update(content).digest("hex");
}

export class ArtifactStore {
  #root;
  #clock;

  constructor({ rootDirectory, clock = () => new Date() }) {
    if (!path.isAbsolute(rootDirectory)) fail("VALIDATION_FAILED", "Artifact root must be an absolute internal path.");
    this.#root = path.resolve(rootDirectory);
    this.#clock = clock;
  }

  async initialize() {
    await Promise.all(["staged", "objects", "quarantine", "trash"].map((area) => mkdir(path.join(this.#root, area), { recursive: true })));
  }

  async stage({ ownerType, ownerId, mediaType, content, expectedSha256 }) {
    assertOwner(ownerType, ownerId);
    if (typeof mediaType !== "string" || mediaType.length < 3 || mediaType.length > 128) fail("VALIDATION_FAILED", "Artifact media type is invalid.");
    if (!Buffer.isBuffer(content) && !(content instanceof Uint8Array)) fail("VALIDATION_FAILED", "Artifact content must be bytes.", { fields: ["content"] });
    const bytes = Buffer.from(content);
    const sha256 = digest(bytes);
    if (expectedSha256 && expectedSha256 !== sha256) fail("VALIDATION_FAILED", "Artifact hash does not match expected content.", { expectedSha256, actualSha256: sha256 });
    const artifactId = `artifact_${randomUUID()}`;
    const artifact = { artifactId, ownerType, ownerId, mediaType, sizeBytes: bytes.length, sha256, status: "staged", createdAt: this.#clock().toISOString() };
    const artifactDirectory = this.#artifactDirectory("staged", artifactId);
    try {
      await mkdir(artifactDirectory);
      await this.#exclusiveWrite(this.#path("staged", artifactId, "data"), bytes);
      await this.#exclusiveWrite(this.#path("staged", artifactId, "metadata.json"), JSON.stringify(artifact));
    } catch (error) {
      await rm(artifactDirectory, { recursive: true, force: true });
      throw error;
    }
    return artifact;
  }

  async commit(artifactId, owner) {
    const artifact = await this.#metadata("staged", artifactId);
    this.#assertOwnership(artifact, owner);
    const bytes = await readFile(this.#path("staged", artifactId, "data"));
    if (bytes.length !== artifact.sizeBytes || digest(bytes) !== artifact.sha256) {
      await this.#moveArtifact("staged", "quarantine", artifactId, { ...artifact, status: "quarantined" });
      fail("WORKER_PROTOCOL_ERROR", "Artifact integrity verification failed.", { artifactId });
    }
    const available = { ...artifact, status: "available" };
    await this.#moveArtifact("staged", "objects", artifactId, available);
    return available;
  }

  async read(artifactId, owner) {
    const artifact = await this.#metadata("objects", artifactId);
    this.#assertOwnership(artifact, owner);
    const bytes = await readFile(this.#path("objects", artifactId, "data"));
    if (bytes.length !== artifact.sizeBytes || digest(bytes) !== artifact.sha256) {
      await this.#moveArtifact("objects", "quarantine", artifactId, { ...artifact, status: "quarantined" });
      fail("WORKER_PROTOCOL_ERROR", "Artifact integrity verification failed.", { artifactId });
    }
    return { artifact, content: bytes };
  }

  async softDelete(artifactId, owner) {
    const artifact = await this.#metadata("objects", artifactId);
    this.#assertOwnership(artifact, owner);
    const deleted = { ...artifact, status: "deleted" };
    await this.#moveArtifact("objects", "trash", artifactId, deleted);
    return deleted;
  }

  async purgeDeleted(artifactId, owner) {
    const artifact = await this.#metadata("trash", artifactId);
    this.#assertOwnership(artifact, owner);
    await rm(this.#artifactDirectory("trash", artifactId), { recursive: true });
  }

  async #exclusiveWrite(target, content) {
    const handle = await open(target, "wx");
    try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
  }

  async #metadata(area, artifactId) {
    if (!/^artifact_[0-9a-f-]{36}$/.test(artifactId)) fail("VALIDATION_FAILED", "Artifact ID is invalid.", { artifactId });
    try { return JSON.parse(await readFile(this.#path(area, artifactId, "metadata.json"), "utf8")); }
    catch (error) { if (error.code === "ENOENT") fail("RESOURCE_NOT_FOUND", "Artifact was not found.", { artifactId }); throw error; }
  }

  #assertOwnership(artifact, owner) {
    if (!owner || typeof owner !== "object") fail("VALIDATION_FAILED", "Artifact owner is required.", { fields: ["owner"] });
    assertOwner(owner.ownerType, owner.ownerId);
    if (artifact.ownerType !== owner.ownerType || artifact.ownerId !== owner.ownerId) fail("ARTIFACT_OWNERSHIP_VIOLATION", "Artifact does not belong to the requested resource.", { artifactId: artifact.artifactId });
  }

  async #moveArtifact(from, to, artifactId, metadata) {
    const metadataPath = this.#path(from, artifactId, "metadata.json");
    const handle = await open(metadataPath, "w");
    try { await handle.writeFile(JSON.stringify(metadata)); await handle.sync(); } finally { await handle.close(); }
    await rename(this.#artifactDirectory(from, artifactId), this.#artifactDirectory(to, artifactId));
  }

  #artifactDirectory(area, artifactId) { return path.join(this.#root, area, artifactId); }
  #path(area, artifactId, filename) { return path.join(this.#artifactDirectory(area, artifactId), filename); }
}
