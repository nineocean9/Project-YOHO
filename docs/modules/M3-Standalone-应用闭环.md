# M3 — Standalone 应用闭环

## 状态

**Planned**

## 合并范围

本阶段合并原 M4 Python Worker 与评测、原 M5 Electron Main/Preload、原 M6 Vue 基础和原 M7 Vue 业务迁移。

## 目标

交付可离线运行的 Standalone Desktop 垂直闭环：Vue 业务界面通过统一 Application Port 调用 typed IPC，本地服务协调 SQLite、ArtifactStore 和 Python Worker，完成患者、影像、ROI、采样、数据集、训练、预测、审核与报告流程，并产生可复现评测证据。

## 前置依赖

- M2 数据基础已完成。
- M1 contract `1.0.0` 保持唯一语义源。
- 导入 YOHO 源码、权重或医学数据前完成对应许可与来源核验；未满足时只使用合成 fixture 和协议 stub 验证工程闭环。

## 允许修改范围

- `services/ai-worker` 与 evaluation contract/tests。
- `apps/desktop` 的 Electron main、preload、Vue renderer、Application Port adapter 与测试。
- 必要的 contracts 兼容性更新、本文件及 `CHANGELOG.md`。

## 不在本阶段

- Spring Boot/MySQL、LAN 多用户/RBAC、自动双向同步、最终发布打包。
- 通用 `runPython`、任意路径读写、renderer 直连数据库/文件/Python。
- 无评测证据的算法指标或临床结论。

## 内部实施顺序

1. Worker JSON/JSONL adapter 与合成数据 smoke/evaluation。
2. Electron 本地 Application Service、typed IPC 和安全 preload。
3. Vue/Vite/Router/Pinia 与 Application Port adapter。
4. 按患者到报告的顺序打通业务闭环并做桌面端集成测试。

以上是同一阶段内的依赖顺序，不再作为独立里程碑；每一步仍需通过测试后再进入下一步。

## 交付与验收

- Standalone 在断网条件下可使用合成 fixture 完成至少一个端到端流程。
- IPC 与 Worker 消息符合 M1 schema，取消、失败、重试和恢复行为可观察。
- Electron 启用最小权限边界，renderer 不获得路径、Node 或任意执行能力。
- 单元、组件、Worker contract 与桌面集成测试通过；算法结果只记录真实执行证据。

## 交接给 M4

交付稳定的 Vue Application Port、Standalone IPC adapter、任务事件和端到端 fixture；LAN adapter 必须保持同一业务语义，不得要求改写 Vue 业务层。

## 原拆分文档

- `docs/modules/M4-Python-Worker-与评测.md`
- `docs/modules/M5-Electron-Main-与-Preload.md`
- `docs/modules/M6-Vue-3-+-TypeScript-基础.md`
- `docs/modules/M7-Vue-业务模块迁移.md`
