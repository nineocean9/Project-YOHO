# MediScan AI / Project-YOHO

> 基于 YOHO 单图学习研究成果构建的医学影像算法产品化与企业级工程实践项目。

## 1. 项目定位

本项目将 YOHO 早期食管癌单图分割科研代码改造为可运行、可测试、可审计、可部署的医学影像平台。目标产品包含两种明确的运行形态：

- **Standalone Desktop（规划中）**：Vue 3 + TypeScript + Electron + SQLite + 本地 Python Worker，支持无网络运行。
- **Enterprise LAN（规划中）**：Vue/Electron + Spring Boot + MySQL + Python Worker，提供多用户、RBAC、审计和任务协作。

当前目录是全新重构项目。旧项目 `F:/YOHO-Manager` 仅作为只读基线与迁移来源，未经用户明确确认不得修改、删除或覆盖。

## 2. 来源与贡献边界

### 上游研究与代码

- 论文：Haipeng Li 等，《Single-Image-Based Deep Learning for Segmentation of Early Esophageal Cancer Lesions》，arXiv:2306.05912，后发表于 IEEE Transactions on Image Processing（2024）。
- 上游仓库：`https://github.com/lhaippp/YOHO`
- 上游许可证：MIT License，`Copyright (c) 2023 Li Haipeng`
- 上游主要能力：医生 ROI 与几何采样、单图合成数据集、edge-enhanced U-Net 训练、单图预测。

### 本项目目标贡献

- 将科研脚本封装成稳定、结构化、可追踪的 Python Worker。
- 建立患者、检查、影像、标注、数据集、模型、预测、任务和 artifact 的领域模型。
- 提供患者级文件隔离、模型版本、任务状态、审计和可复现实验链路。
- 使用 Vue 3 + TypeScript + Electron 建设离线工作站。
- 使用 Spring Boot 建设可选的医院内网协同服务。

不得把 YOHO 方法、eUNet、论文数据或论文指标描述为本项目原创成果。

## 3. 指标声明

| 指标来源 | 当前状态 | 可否写成项目实测 |
|---|---|---|
| 论文 EEC-2022 mDice 0.888、mIoU 0.804 | 论文报告值 | 否 |
| Project-YOHO 本地 Dice/IoU | 尚未完成独立评测 | 否 |
| 工程指标（耗时、失败率、测试覆盖等） | 尚待各模块生成证据 | 完成验证后可写 |

任何简历数字必须能追溯到数据 manifest、评测命令、配置、代码版本、权重和原始结果。未完成 Phase M4 的评测证据前，禁止写“本项目 Dice ≥ 0.88”。

## 4. 目标架构

```text
┌──────────────────────────────────────────────────────────┐
│ Vue 3 + TypeScript UI                                    │
│ 患者 / 影像 / ROI / 采样 / 任务 / 模型 / 预测 / 审核     │
└──────────────────┬───────────────────────┬───────────────┘
                   │                       │
        Standalone Desktop          Enterprise LAN
                   │                       │
        Electron typed IPC          HTTPS REST + SSE
                   │                       │
┌──────────────────▼───────────┐  ┌────────▼─────────────────┐
│ Electron Local Services      │  │ Spring Boot 3 Server      │
│ SQLite / ArtifactStore       │  │ Security / RBAC / Audit   │
│ Local Task Manager           │  │ MySQL / Task Coordination │
└──────────────────┬───────────┘  └────────┬─────────┬────────┘
                   │                       │         │
             JSON/JSONL                 MySQL   MinIO/NAS(可选)
                   │                       │
        ┌──────────▼───────────────────────▼──────────┐
        │ Python YOHO Worker                          │
        │ sample / dataset / train / predict / eval  │
        └─────────────────────────────────────────────┘
```

Spring Boot 不替代 Electron 或 PyTorch。它只负责内网模式下的认证、RBAC、业务 API、事务、审计、任务协调与 MySQL 元数据。第一版不做 SQLite 与 MySQL 的自动双向同步。

## 5. Contracts First：强制接口规则

`packages/contracts` 是跨模块唯一契约源。实现任何业务模块前，必须先定义或复用对应契约并通过契约测试。

1. UI 只能调用 Application API，禁止直接访问数据库、文件系统或 Python。
2. Electron Preload 只能暴露白名单业务 API，禁止通用 `runPython(script,args)`、`readFile(path)`、`saveFile(path,data)`。
3. Spring Controller 只能调用 Application Service，禁止直接写 Repository 或拼文件路径。
4. Python Worker 只接受版本化 JSON 请求并返回 JSONL 事件。
5. 跨模块只传 DTO、领域 ID 和事件，不泄漏 SQL 实体、绝对路径、DOM 状态或内部类。
6. API 破坏性变更必须先修改契约版本、兼容策略、契约测试和 CHANGELOG。
7. Electron IPC 与 Spring REST 必须实现相同的 Application Port 语义，不能各自设计一套业务行为。

契约分类与命名规则见 `docs/contracts/README.md`。

## 6. 模块边界

| 模块 | 负责 | 明确不负责 | 唯一对外边界 |
|---|---|---|---|
| Contracts | DTO、Schema、事件、错误码、版本 | 业务实现 | 版本化契约 |
| Domain | 状态转换、业务不变量、资源归属 | HTTP、IPC、DOM、SQL | Domain API |
| ArtifactStore | 受控文件、哈希、原子提交、软删除 | 患者业务状态 | Artifact ID |
| Repository | 元数据事务与查询 | 文件内容、Python 调用 | Entity/DTO |
| TaskService | 排队、状态、超时、取消、恢复 | 算法实现、UI | Command/Event |
| Python Worker | sample/dataset/train/predict/evaluate | 用户权限、患者主数据 | JSON/JSONL |
| Electron Main | 本地适配器、IPC、生命周期 | 页面业务规则 | Typed IPC |
| Vue Renderer | 页面、交互、展示、临时 UI 状态 | DB/文件/Python 直连 | Application Port |
| Spring Boot | 认证、RBAC、事务、API、审计 | PyTorch 实现 | REST/SSE |
| Evaluation | 指标计算、数据 manifest、报告 | UI 展示值、训练调度 | CLI/Report |

## 7. 计划目录结构

```text
Project-YOHO/
├── apps/desktop/                 # Electron + Vue（后续模块创建）
├── services/
│   ├── platform-server/          # Spring Boot（后续模块创建）
│   └── ai-worker/                # Python Worker（后续模块创建）
├── packages/contracts/           # 唯一跨模块契约源
├── docs/
│   ├── contracts/README.md
│   ├── modules/                  # M0-M4 阶段说明和交接
│   └── adr/                      # 已确认架构决策
├── tests/fixtures/               # 仅脱敏/合成/授权样例
├── deploy/                       # 开发与部署配置
├── CHANGELOG.md
├── CONTRIBUTING.md
├── NOTICE
└── README.md
```

## 8. 模块实施顺序

必须按顺序实施，不允许单个聊天窗口跨多个模块大范围开发。

| 编号 | 阶段 | 主要输出 | 状态 |
|---|---|---|---|
| M0 | 项目初始化与基线保护 | 仓库骨架、归属、基线和依赖清单 | Complete |
| M1 | 契约与领域模型 | Domain/Command/Query/Event/Error/API 契约 | Complete |
| M2 | 数据基础 | ArtifactStore、SQLite、迁移与数据保护 | **Next** |
| M3 | Standalone 应用闭环 | Python Worker、Electron、Vue 与离线业务闭环 | Planned |
| M4 | LAN 与统一交付 | Spring Boot/MySQL、双模式适配、CI、打包与文档 | Planned |

阶段内部仍按依赖顺序小步实施和验证，但不再把每个技术组件单独升级为项目里程碑。详细目标、非目标、修改权限、契约、测试和交接见 `docs/modules/M0-*`、`M1-*` 及整合后的 `M2-数据基础.md`、`M3-Standalone-应用闭环.md`、`M4-LAN-与统一交付.md`。原 M2-M10 文档仅保留为历史拆分参考，不再作为执行入口。

## 9. 每个新聊天窗口的工作协议

向新 agent 提交任务时，必须包含当前阶段编号，并要求执行以下步骤：

1. 先阅读 `README.md`、`docs/contracts/README.md` 和当前 `docs/modules/Mx-*.md`。
2. 检查 Git 状态和上一阶段“交接给下一阶段”章节，不覆盖他人未提交修改。
3. 只修改当前阶段允许的目录，不提前实现下一阶段。
4. 阶段内部按文档给定顺序小步实现和验证；不自行新增平行 API，需要新接口时先更新 contracts、版本和契约测试。
5. 完成测试与真实运行验证，记录实际命令和结果。
6. 更新当前阶段状态、CHANGELOG 和交接章节后停止。
7. 代码修改完毕后询问是否提交并推送 GitHub，不得擅自提交或推送。

推荐的新窗口启动提示：

```text
请在 F:/Project-YOHO 实施 Mx 阶段。先阅读 README.md、docs/contracts/README.md、
docs/modules/Mx-*.md 以及上一阶段交接记录。严格遵守 contracts-first 和目录边界，
只完成当前阶段；按阶段文档中的内部顺序实现并验证，不要开始下一阶段。
```

## 10. 阶段完成定义

每个阶段同时满足以下条件才算完成：

- 目标功能已实现，非目标未越界实现。
- 已定义/复用的接口、事件与错误码有 schema 和示例。
- 自动化测试通过，并记录真实验证命令和结果。
- 数据库/文件格式变化有迁移和回退说明。
- 无真实患者数据、明文凭据或无许可资产进入仓库。
- 阶段文档已填写修改文件、已知限制和下一阶段前置条件。
- CHANGELOG 已更新。
- 对外接口无未说明的破坏性变化。

## 11. 数据与安全硬规则

- 旧项目和运行数据默认只读。
- 测试只能使用脱敏、合成或明确授权的数据。
- 影像、模型、数据集不放入 MySQL BLOB。
- 前端不接触绝对路径；所有文件操作经过 ArtifactStore。
- 不存默认密码，不把 secret 写进源码、localStorage、日志或 Git。
- 删除采用资源归属校验、软删除/回收区和审计；禁止未校验的递归删除。
- 日志必须有 correlationId/taskId，并对患者身份和路径脱敏。
- 不实现未经验证的“隐私完全保护”“临床可用”或“无感双向同步”。

## 12. 明确不做

- 不重写 YOHO/eUNet 并声称原创。
- 不把 PyTorch 模型迁移到 Java。
- 不在第一版引入微服务、Kubernetes、服务网格、Redis、RabbitMQ。
- 不为堆砌技术栈而让离线桌面强制启动 Spring Boot/MySQL。
- 不一次性重写全部旧 UI 和 Python 脚本。
- 不在无本地评测证据时使用论文 0.888 作为项目结果。
- 不在 M1 契约冻结前分别开发 Vue、Electron、Spring Boot 和 Worker API。

## 13. 当前阶段

**M1：契约与领域模型已完成。下一阶段为 M2：数据基础。**

M0 已完成：

- 初始化本地 Git 仓库，默认分支为 `main`。
- 建立 `.gitignore`、`.gitattributes` 和 M0 安全校验脚本，检查常见密钥、受限数据/模型文件、fixture manifest 与 SHA-256。
- 建立 [工具链矩阵](docs/toolchain.md)，明确支持版本与本机实际版本的区别。
- 建立 [来源 manifest](docs/sources/yoho-source-manifest.json)，记录旧项目 clean HEAD，并保持源码导入为空。
- 生成非医疗合成 fixture、machine-readable manifest 和确定性生成器。
- 建立 [旧系统行为基线](docs/baseline/legacy-behavior.md)，严格区分 clean baseline、代码推断和 dirty working tree 行为，并列出不得继承的危险行为。

以下事项不是 M0 完成条件，但后续模块必须在对应行为发生前处理：

- Project-YOHO remote 已明确为 `https://github.com/nineocean9/Project-YOHO.git`；提交、设置 remote 或推送仍需用户明确授权。
- 公开发布前确认 Project-YOHO 自身许可证。
- 导入 YOHO 算法源码前，核验 upstream 精确 commit、MIT license 文本/hash 和逐文件导入清单。
- 使用医学数据或模型权重前，单独确认访问、评测与再分发权利。
- 旧系统行为记录目前用于迁移设计参考，不代表已经完成运行兼容性验证。

M1 可以开始，但在契约冻结前不得分别开发 Vue、Spring Boot、SQLite 或 Python Worker API。
