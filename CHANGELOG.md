# Changelog

所有重要变化按模块记录。当前项目仍处于架构初始化阶段，不遵循产品版本发布语义。

## Unreleased

### M0 — Project initialization

- 建立 Project-YOHO 企业级重构总 README。
- 定义 M0-M10 模块顺序、contracts-first 规则和新聊天窗口交接流程。
- 建立 contracts、modules、ADR、fixtures 和 deploy 文档目录骨架。
- 明确 YOHO 上游归属、论文指标与本地实测指标边界。
- 指定 `F:/YOHO-Manager` 为只读基线，`F:/Project-YOHO` 为重构目录。
- 初始化本地 `main` Git 仓库；未设置 remote、未提交、未推送。
- 新增 `.gitignore`、`.gitattributes` 与 `scripts/m0/verify.py` 安全验证入口。
- 新增支持/本机工具链矩阵与 machine-readable YOHO 来源 manifest。
- 新增确定性非医疗 RGB、ROI mask、虚构领域元数据 fixture 及 SHA-256 manifest。
- 新增旧系统行为基线，区分 clean commit、代码推断与未提交工作树证据，并记录不迁移的危险行为。
- M0 已完成：初始化、安全规则、来源记录结构、合成 fixture、工具链矩阵、行为基线与轻量自动校验均已落地。
- 上游源码核验、数据/权重权利与项目发布许可证按需延后至首次导入、评测或发布前处理，不阻塞 M1。
