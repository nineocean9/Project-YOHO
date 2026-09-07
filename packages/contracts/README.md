# Contract Package

`packages/contracts` is the single canonical cross-module contract source for Project-YOHO. Version `1.0.0` uses JSON Schema Draft 2020-12 and is validated with Ajv.

## Contents

- `schema/domain`: common types, domain resources and state transitions.
- `schema/envelopes.schema.json`: command, query, event, error and Worker envelopes.
- `schema/events.schema.json`: stable domain event catalogue.
- `schema/api/operation-manifest.json`: shared Application Port mapped to IPC and HTTP.
- `examples`: synthetic valid messages only.
- `tests`: schema, state transition, adapter mapping and Worker protocol checks.

## Commands

From the repository root:

```bash
npm run contracts:validate
npm run contracts:test
```

## Consumer rules

Consumers validate at their boundary and map generated/native types back to these schemas. Generated TypeScript, Java or Python types are derived artifacts, never an independent contract source. Do not copy and alter DTOs inside Vue, Electron, Spring Boot or the Python Worker.

Only additive optional fields are compatible within version 1. Breaking changes require a contract version change, migration notes, examples, adapter updates and contract tests. Files cross boundaries only as artifact IDs; arbitrary paths, scripts and raw internal errors are prohibited.

See `docs/contracts/README.md` for frozen semantics and compatibility rules.
