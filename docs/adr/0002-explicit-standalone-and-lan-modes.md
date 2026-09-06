# ADR-0002: Explicit Standalone and LAN Modes

- Status: Accepted
- Date: 2026-09-06

## Context

Medical-image processing must work without Internet access, while an enterprise portfolio should also demonstrate multi-user authentication, audit and centralized task management. Making Spring Boot and MySQL mandatory for every desktop installation would add unnecessary operational dependencies.

## Decision

- Standalone mode uses Electron, SQLite, local ArtifactStore and local Python Worker.
- LAN mode uses the shared Vue UI with Spring Boot, MySQL and a managed Python Worker.
- Both modes implement the same Application Port semantics.
- The first release will not implement transparent bidirectional synchronization between SQLite and MySQL.
- Cross-mode data transfer, if needed, starts as explicit, validated import/export.

## Consequences

- Offline capability remains testable and real.
- Spring Boot has a justified enterprise responsibility instead of acting as a local proxy.
- Automatic offline synchronization is deferred until its conflict and privacy rules are explicitly designed.
