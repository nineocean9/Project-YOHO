# ADR-0004: JSON Schema Contract Distribution

- Status: Accepted
- Date: 2026-09-06

## Context

The shared Application Port must be consumed by TypeScript, Java and Python without allowing generated language-specific DTOs to become competing sources of truth. M1 also needs executable validation before any runtime adapter exists.

## Decision

- JSON Schema Draft 2020-12 files in `packages/contracts/schema` are canonical.
- Contract version `1.0.0` is embedded in stable schema identifiers and message envelopes.
- Ajv validates schemas and examples in M1; language-specific code generation is deferred to each adapter module.
- Generated types are disposable derived artifacts and may not redefine field semantics.
- The machine-readable operation manifest maps one Application Port operation to both IPC and HTTP adapters.

## Consequences

- M2 and later modules can consume stable schemas without requiring an application framework in M1.
- Breaking schema changes require a version change, migration notes and updated contract tests.
- Each adapter remains responsible for boundary validation while sharing the same canonical contract.
