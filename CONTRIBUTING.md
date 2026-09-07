# Contributing to Project-YOHO

## 工作目录

- 重构项目：`F:/Project-YOHO`
- 旧项目基线：`F:/YOHO-Manager`（默认只读）

## 模块化工作流

1. 每个开发窗口只实施一个 M0-M4 阶段；阶段内部按对应文档顺序小步实现和验证。
2. 开始前阅读根 README、contracts 文档、当前阶段文档和上一阶段交接。
3. 只修改当前阶段允许的目录。
4. 先更新契约和测试，再实现跨模块 API。
5. 完成后更新阶段交接和 CHANGELOG，不自动进入下一阶段。

## Git 规则

- 修改前先执行 `git status`，不得覆盖不明来源的工作。
- 只暂存当前阶段明确修改的文件，禁止无审查地 `git add .`。
- 未经用户明确要求不得提交或推送。
- 代码修改完成后统一询问：`代码已修改完毕，是否要提交并推送到 GitHub 仓库？`
- 不允许跳过 hooks，不允许擅自强推或重写历史。

## Contracts First

- `packages/contracts` 是唯一跨模块契约源。
- UI、Electron、Spring Boot、Python 不得各自发明同义接口。
- 文件只通过 artifact ID 访问。
- 长任务只通过 task command/event 交互。
- 破坏性变化必须版本化并更新所有 adapter 契约测试。

## 数据安全

- 禁止提交真实患者图像、姓名、病历号、数据库备份或模型训练原始数据。
- fixture 必须是合成、完全脱敏或具有明确再分发许可的数据。
- 禁止提交 `.env`、数据库密码、token、密钥、凭据或含敏感路径的日志。
- 上游数据集许可需独立确认；代码 MIT License 不自动覆盖医学数据。

## 代码质量

具体工具由对应模块引入，但最终至少执行：

- Vue/TypeScript：format、lint、typecheck、unit、component、E2E。
- Spring Boot：format/static analysis、unit、integration、migration test。
- Python：format、lint、unit、worker contract、algorithm smoke。
- Contracts：schema validation、examples、cross-adapter contract tests。

任何模块都不得用硬编码成功结果、虚构 accuracy/Dice 或吞掉异常来通过验收。

## 文档与交接

每个阶段文档必须维护：

- 目标与非目标；
- 输入、输出和依赖；
- 修改/禁止目录；
- API、事件和错误契约；
- 数据迁移；
- 测试命令及真实结果；
- 已知限制；
- 下一阶段前置条件。
