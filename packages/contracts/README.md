# Contract Package

This directory becomes the single cross-module contract source in M1.

Do not add ad-hoc DTOs here before M1 defines:

- schema language and code-generation strategy;
- versioning and compatibility rules;
- domain IDs, enums and timestamps;
- command/query/event/error envelopes;
- Electron IPC, Spring HTTP/SSE and Python Worker mappings;
- contract-test execution.

See `docs/contracts/README.md`.
