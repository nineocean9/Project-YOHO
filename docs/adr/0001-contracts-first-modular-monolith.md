# ADR-0001: Contracts-First Modular Monolith

- Status: Accepted
- Date: 2026-09-06

## Context

Project-YOHO must support an offline Electron workstation and an optional Spring Boot LAN server while sharing one business workflow. Independent IPC, REST, database and worker APIs would create semantic drift and make separate chat-window implementation unreliable.

## Decision

- Use `packages/contracts` as the single cross-module contract source.
- Build a modular monolith before considering distributed services.
- Electron IPC and Spring REST/SSE are adapters for the same Application Port.
- Python algorithms remain behind a versioned JSON/JSONL Worker contract.
- Modules may not access another module's database tables, filesystem layout or internal classes directly.

## Consequences

- M1 must finish before implementation teams independently build adapters.
- Cross-module changes require contract versioning and tests.
- Some initial work is documentation/schema-heavy, but later modules can be implemented independently with lower integration risk.
