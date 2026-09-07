# Contracts Guide

## 目的

`packages/contracts` 是 Project-YOHO 唯一跨模块契约源。Electron IPC、Spring REST/SSE、Vue 客户端、Repository adapter 和 Python Worker 必须围绕同一业务语义实现，禁止各自创建不兼容 API。

## M1 冻结版本与规则

- 契约版本为 `1.0.0`，canonical schema 使用 JSON Schema Draft 2020-12。
- schema 的 `$id` 使用 `https://project-yoho.dev/contracts/1.0.0/` 稳定 URI；新增可选字段属于兼容变更，删除、改名或改变含义必须升级版本并更新测试。
- ID 是带资源前缀的不透明 UUID 字符串，由 application service 生成；客户端不解析 ID，也不以 ID 拼接路径。
- 时间统一为带 `Z` 的 ISO 8601 UTC；比例字段为 0 到 1 的 fraction。
- 可变资源使用 `revision` 和 `expectedRevision`（由具体 command payload 承载）；重复 command 使用 `idempotencyKey`。
- 患者显示名与外部标识标注为敏感字段；错误、事件与日志不得返回姓名、病历号、绝对路径、堆栈或原始 Worker stderr。
- 文件只通过 `artifactId` 与受控 artifact reference 传递。canonical contract 不接受任意绝对路径、脚本名或通用文件 API。
- completed annotation/version 和 task 终态不可逆；删除采用归档/受控生命周期，不表示从快照缺失即物理删除。

## 目录

```text
packages/contracts/
├── schema/domain/common.schema.json       # ID、时间、比例、artifact reference
├── schema/domain/resources.schema.json    # 领域资源与隐私标注
├── schema/domain/state-transitions.mjs    # 允许的状态转换
├── schema/envelopes.schema.json            # command/query/event/error/worker envelope
├── schema/events.schema.json               # 领域事件类型目录
├── schema/api/operation-manifest.json      # Application Port 的 IPC/HTTP 映射
├── examples/                               # 合成有效样例（无真实数据）
├── scripts/                                # Ajv 验证入口
└── tests/                                  # schema 与语义契约测试
```

## Application Port 映射

`schema/api/operation-manifest.json` 是操作目录。每个 command/query 同时具有白名单 IPC channel 和 `/api/v1/` HTTP route，并引用同一个 envelope schema。IPC 与 REST/SSE 是同一 Application Port 的 adapter；M1 不实现 adapter。

长任务 command 立即返回 task reference，状态通过统一 event envelope 传递。SSE consumer 使用事件 `eventId` 作为 resume 标识，重连和重复事件处理由后续 adapter 实现；M1 不宣称可靠投递。

## Worker 协议

Worker request 使用 `workerRequest` envelope，operation 为 `sample`、`dataset`、`train`、`predict` 或 `evaluate`，输入只能是 artifact references。Worker 输出是一行一个 JSON object 的 JSONL `workerEvent`，包含递增 sequence，且每个 request 只能有一个 terminal event：`completed`、`failed` 或 `cancel-ack`。Worker 不接收权限模型、任意脚本或任意路径。

## 领域与状态

领域资源包括 Patient、Examination、Image、AnnotationVersion、DatasetVersion、ModelVersion、PredictionResult、Artifact、Task、AuditEvent、User 和 Role。Annotation 以 draft/completed 区分，ROI 使用闭合的 image-pixel 坐标点，采样使用带 kind/sequence 的 JSON 点，不使用 pickle。模型指标必须由 evaluation manifest artifact 证明，不能由调用方直接提交任意 accuracy。

Image、Annotation 和 Task 的允许转换及终态规则位于 `state-transitions.mjs`，并由测试锁定。资源归属通过 owner ID 与 Artifact ownerType/ownerId 表达；后续 ArtifactStore 必须在读写、归档和删除前校验归属。

## 错误目录

统一 error envelope 的稳定错误码为：`VALIDATION_FAILED`、`RESOURCE_NOT_FOUND`、`CONFLICT`、`INVALID_STATE_TRANSITION`、`UNAUTHORIZED`、`FORBIDDEN`、`ARTIFACT_OWNERSHIP_VIOLATION`、`TASK_STATE_INVALID`、`WORKER_PROTOCOL_ERROR`、`SERVICE_UNAVAILABLE`、`INTERNAL_ERROR`。message 面向用户，details 只允许结构化安全信息，`retryable` 与 `correlationId` 必须存在。

## 验证

在 Node.js 24 / npm 11 环境执行：

```bash
npm install
npm run contracts:validate
npm run contracts:test
python scripts/m0/verify.py
```

M1 只验证契约和协议，不启动后续 Worker、数据库、Electron、Vue 或 Spring 实现。
