# Legacy Behavior Baseline

## Scope and evidence rules

Migration reference: `F:/YOHO-Manager`, read-only.

- Reproducible clean anchor: Git commit `20e4f546a5d86369da5acb10b669524e34317a04`.
- The working tree contained tracked modifications and untracked files when inspected on 2026-09-06. Those files are not a reproducible baseline.
- No legacy application, database, patient directory, training job, or prediction job was run during M0.
- “Code-inferred” means the behavior was observed in source but not executed in an isolated environment.
- “Dirty-only” means the evidence comes from the uncommitted working tree and must not be attributed to the clean commit.
- Patient data, logs, model weights, database exports, localStorage snapshots, and EEC data were not inspected or copied.

## Behavior inventory

| Capability | Evidence | Current behavior | Migration requirement |
|---|---|---|---|
| Patient metadata | Dirty-only, code-inferred from `db.js` | Patient records include name, gender, age, admission ID, scope type, doctor, history, status and date. | M1 must minimize required identifying fields and classify sensitive fields. |
| Examination and image nesting | Dirty-only, code-inferred from `db.js` | Patients contain checks; checks contain images; foreign keys cascade deletes. | Model these as independent aggregates/references with explicit ownership and archive semantics. |
| Frontend/MySQL synchronization | Dirty-only, code-inferred from `db.js` | A full frontend snapshot is upserted, then every database record absent from the snapshot is deleted. | Do not preserve this deletion behavior. Use commands, transactions, idempotency and optimistic concurrency. |
| Image import and patient directories | Dirty-only, code-inferred from `main.js` | Images are copied beneath a patient-named directory and absolute paths are returned to the renderer. | Route all files through ArtifactStore IDs; never expose absolute paths. |
| ROI | Dirty-only, code-inferred from `db.js` and UI bridge | ROI points and ROI-mask paths are stored with image records. | M1 must define draft/completed annotation versions and explicit reverse-ROI semantics. |
| Sampling | Dirty-only, code-inferred from `db.js` and UI bridge | Sample points and a pickle-path field are stored with image records. | Define validated canonical JSON/artifact representation; never unpickle untrusted input. |
| Dataset generation | Dirty-only, code-inferred from Electron menu and generic Python bridge | Renderer can request Python scripts and pass dataset/output paths. | Replace with a typed `GenerateDataset` command and task events. |
| Training | Dirty-only, code-inferred from Electron menu, generic Python bridge and model archive | Training is script-driven; archived metadata may include epoch, accuracy, source image and an absolute weight path. | Use immutable model versions, artifact IDs and evidence-backed metrics only. |
| Prediction | Dirty-only, code-inferred from Electron menu and generic Python bridge | Prediction is script-driven and reads/writes caller-selected paths. | Use a typed prediction request, task workspace and declared output artifacts. |
| Cancellation | Not verified | No reliable typed cancellation lifecycle was established in the reviewed main-process bridge. | M1 must define task states and cancellation semantics; M4/M5 must implement process termination and recovery. |
| Model archive | Dirty-only, code-inferred from `main.js` | A caller supplies source weight path, patient ID, model name and metadata; files are copied into a patient model directory. | Validate ownership and hashes, stage atomically, and store model versions via ArtifactStore. |
| Error presentation | Dirty-only, code-inferred from `main.js` and `preload.js` | Many handlers return arbitrary `{ error: message }`; Python stdout/stderr is forwarded to the renderer. | Use the common error envelope; sanitize diagnostics and keep internal paths/stacks out of UI responses. |

## Unsafe behavior that must not be preserved

1. The preload bridge exposes generic `readFile`, `saveFile`, `runPython`, configuration read/write and broad path-oriented APIs.
2. The main process accepts arbitrary script names and path arguments for Python execution.
3. Arbitrary absolute paths can be read, written, copied, opened and returned to the renderer.
4. Patient/image deletion performs recursive forced deletion without an ArtifactStore ownership, quarantine or retention boundary.
5. The database layer has a plaintext fallback password.
6. Full-snapshot synchronization deletes records that are absent from renderer state.
7. Model metadata accepts caller-provided accuracy without a reproducible evaluation manifest.
8. Raw Python stdout/stderr can reach the renderer and may expose internal paths or sensitive values.
9. Electron sandboxing is disabled in the inspected working-tree main process.

## Clean-baseline verification still required

Before claiming behavioral compatibility, create an isolated clean checkout at the recorded commit and use only generated synthetic fixtures. Verify, without connecting to an existing database or patient directory:

- patient create/update/archive semantics;
- examination/image relationships;
- ROI closure, undo and reverse behavior;
- foreground/background sampling order and serialization;
- generated dataset layout and geometry;
- one-image-one-network training inputs and outputs;
- prediction thresholds and reverse handling;
- cancellation, restart and failure behavior;
- model archival and error display.

Full algorithm-output verification remains blocked until the upstream revision, source license, input-data rights and any required model weights are approved and pinned.
