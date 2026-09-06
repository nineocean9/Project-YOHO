# Toolchain Matrix

## Supported baseline

| Component | Supported version | Status |
|---|---|---|
| Node.js | 24 LTS | Required for future TypeScript/Electron workspace |
| npm | 11 | Root workspace package manager |
| Python | 3.11 | Required before M4 Python Worker work begins |
| Java | 21 LTS | Required before M8 Spring Boot work begins |
| Maven | Wrapper-managed 3.9 line | No global Maven requirement |
| MySQL | 8.4 LTS | Planned LAN metadata store |
| SQLite | Selected Node driver embedded version | Planned Standalone metadata store |
| Windows | Windows 11 x64 | Initial packaging target |

Exact dependency versions will be locked by the owning modules. This document defines supported runtime lines only; it does not create those modules or approve an upstream dependency.

## Observed local environment on 2026-09-06

| Component | Observed version | Notes |
|---|---|---|
| Node.js | 24.19.0 | Compatible with the supported baseline |
| npm | 11.17.0 | Compatible with the supported baseline |
| Python | 3.8.3 | Too old for the planned Worker baseline; do not use for M4 |
| Git | 2.49.0.windows.1 | Available for local repository initialization |
| Java | Not verified in M0 | Java 21 must be verified before M8 |
| Maven | Not verified in M0 | M8 will use Maven Wrapper |

## Rules

- `F:/YOHO-Manager` remains a read-only migration reference; its installed dependencies do not define the Project-YOHO support matrix.
- No runtime-specific project manifest is created in M0. M1 owns the Node workspace, M4 owns Python packaging, and M8 owns the Maven Wrapper.
- A module must fail its environment check explicitly when the supported runtime is unavailable. It must not silently substitute an unsupported Python or Java version.
