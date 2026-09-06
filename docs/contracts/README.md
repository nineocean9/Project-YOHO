# Contracts Guide

## 目的

`packages/contracts` 是 Project-YOHO 唯一跨模块契约源。Electron IPC、Spring REST/SSE、Vue 客户端、Repository adapter 和 Python Worker 必须围绕同一业务语义实现，禁止各自创建不兼容 API。

当前状态：**M0 文档骨架；所有业务契约均未冻结。** M1 将完成正式设计和契约测试。

## 契约层级

```text
Domain Vocabulary
  ├── Commands       改变状态，返回 accepted/result
  ├── Queries        只读查询，禁止副作用
  ├── Events         已发生事实，不作为命令使用
  ├── Errors         跨进程统一失败语义
  ├── Application Port
  │     ├── Electron IPC adapter
  │     └── Spring HTTP/SSE adapter
  └── Worker Contract
        └── Python JSON request / JSONL event
```

## 计划目录

```text
packages/contracts/
├── domain/
├── commands/
├── queries/
├── events/
├── errors/
├── ipc/
├── http/
├── worker/
├── database/
├── examples/
└── tests/
```

目录将在 M1 根据选定的 schema 工具创建。M0 不提前写伪契约。

## 领域对象范围

- Patient
- Examination
- Image
- AnnotationVersion
- DatasetVersion
- ModelVersion
- PredictionResult
- Artifact
- Task
- AuditEvent
- User / Role（LAN 模式）

## Command 范围

- Create/Update/Archive Patient
- Import/Delete Image
- Save/Complete ROI
- Save/Complete Sampling
- Generate Dataset
- Train Model
- Run Prediction
- Review Prediction
- Export Report
- Cancel/Retry Task

## Query 范围

- List/Get Patient
- List/Get Examination and Image
- List Annotation/Dataset/Model/Prediction Versions
- Get Task and Task Logs
- Resolve/Download Artifact
- Get Report

## Event 范围

- TaskQueued / TaskStarted / TaskProgress
- ArtifactCreated
- TaskCompleted / TaskFailed / TaskCancelled
- AnnotationCompleted
- DatasetGenerated
- ModelArchived
- PredictionCompleted / PredictionReviewed

## 统一错误格式

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "面向用户且不泄漏内部路径的信息",
  "details": {},
  "retryable": false,
  "correlationId": "corr_xxx"
}
```

M1 必须建立稳定的错误码目录。模块不得只返回任意字符串或将原始堆栈暴露给 UI。

## API 语义规则

1. ID 使用不透明字符串；客户端不得解析 ID 来拼路径。
2. 时间统一使用 ISO 8601，必须包含时区或明确采用 UTC。
3. 比例字段明确单位，例如 `lesionAreaPercent`，不能混用 `0.047` 和 `4.7`。
4. 枚举只允许契约中声明的值；未知值按兼容策略处理。
5. Command 应支持幂等键或明确重复提交行为。
6. 长任务返回 `taskId`，不保持 IPC/HTTP 请求直至训练结束。
7. 分页、排序和过滤语义在 HTTP 与 IPC adapter 中保持一致。
8. 事件至少包含 `eventId`、`eventType`、`occurredAt`、`correlationId`、`schemaVersion`。
9. Python Worker 不接触用户权限；调用方必须先完成权限和资源归属校验。
10. 文件仅通过 artifact ID 传递，上层不能传任意绝对路径。

## 版本规则

- 初始契约版本由 M1 定义。
- 增加可选字段属于兼容变更；删除、重命名、改变含义属于破坏性变更。
- 破坏性变更必须同步更新：schemaVersion、contract tests、adapter、迁移说明、CHANGELOG。
- 不允许 Vue、Electron、Spring Boot 或 Python 单方面修改字段意义。

## M1 前置问题

M1 必须在编码前明确：

- ID 格式与生成责任。
- Patient/Examination/Image 的必填字段和隐私分级。
- Annotation/Dataset/Model 的版本与不可变规则。
- ImageStatus 和 TaskStatus 的合法转换。
- Standalone 与 LAN 共用的 Application Port。
- Artifact URI/ID 的传递方式。
- 幂等、分页、并发版本和错误码策略。
- REST endpoint、SSE resume、IPC channel 映射。
- Worker 请求和事件的 schema version。
