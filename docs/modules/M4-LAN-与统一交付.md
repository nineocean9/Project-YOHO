# M4 — LAN 与统一交付

## 状态

**Planned**

## 合并范围

本阶段合并原 M8 Spring Boot 服务端、原 M9 Standalone/LAN 适配和原 M10 测试、CI、打包与文档。

## 目标

在不破坏 Standalone 的前提下交付 Enterprise LAN adapter，并完成两种模式的统一验收：Spring Boot/MySQL 提供认证、RBAC、审计、REST/SSE 和任务协调；相同 Vue 业务层可显式选择 IPC 或 REST/SSE；最终建立跨语言 CI、Windows 打包、部署与可复现项目证据。

## 前置依赖

- M3 Standalone 应用闭环已完成并提供可复用 Application Port 与端到端 fixture。
- Java 21、Maven Wrapper 和 MySQL 8.4 环境在本阶段开始前验证。

## 允许修改范围

- `services/platform-server`、HTTP/SSE adapter、MySQL migration、认证/RBAC/审计与测试。
- Standalone/LAN adapter 联调、CI、deploy、Windows 打包、验收测试与正式文档。
- 必要的 contracts 兼容性更新、本文件及 `CHANGELOG.md`。

## 不在本阶段

- SQLite/MySQL 透明双向同步、微服务/Kubernetes/Redis/RabbitMQ、PyTorch Java 化。
- 破坏 Standalone 离线运行或形成第二套 Application Port。
- 无来源与评测证据的发布资产、医学数据、指标或临床结论。

## 内部实施顺序

1. Spring Boot/MySQL 实现共享 Application Port、RBAC、审计与任务协调。
2. Vue adapter 显式切换 Standalone IPC 与 LAN REST/SSE，并运行跨模式契约测试。
3. 完成 CI、Windows 打包、部署说明、许可证/来源门槛和项目验收证据。

## 交付与验收

- 同一业务 fixture 在两种 adapter 上产生一致的领域结果和错误语义。
- LAN 模式验证认证、权限、审计、并发版本、SSE 重连与任务生命周期；Standalone 仍可完全离线运行。
- 数据库迁移、回退、打包和部署可重复；跨语言 CI 与端到端测试通过。
- 发布前完成 Project-YOHO 许可证、已导入上游文件及资产权利核验；未满足的能力不得进入发布包。

## 最终交接

记录完成/未完成项、版本冻结点、数据库与 artifact 迁移、两种模式测试结果、发布资产、已知风险及禁止破坏的行为，随后进入项目验收而非新增架构层级。

## 原拆分文档

- `docs/modules/M8-Spring-Boot-服务端.md`
- `docs/modules/M9-Standalone-与-LAN-适配.md`
- `docs/modules/M10-测试、CI、打包与文档.md`
