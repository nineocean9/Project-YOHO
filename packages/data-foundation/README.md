# Data Foundation

M2 的本地数据基础实现，运行环境为 Node.js 24。

## 边界

- `ArtifactStore` 独占文件内容管理：调用方提供字节内容、artifact ID 和 owner，不提供或接收文件路径。
- `SqliteRepository` 独占 SQLite 元数据管理；影像、模型和数据集内容不得写入数据库 BLOB。
- 模块复用 contracts `1.0.0` 的 ID、Artifact、owner、status、revision 和错误码语义，不定义平行 DTO。

## Artifact 生命周期

`stage` 写入受控暂存区并计算 SHA-256；`commit` 再次核验大小和哈希后原子移入可用区。校验失败的内容进入隔离区。`softDelete` 先移动到回收区，只有显式 `purgeDeleted` 且 owner 完全匹配时才物理回收。

存储根目录和内部文件名是 adapter 私有实现，不属于 Application Port。

## SQLite 与迁移

初始 migration 建立通用领域元数据表、Artifact 元数据表和幂等导入报告表。每个 migration 在独立事务中执行，失败自动回滚；`rollback(targetVersion)` 提供显式回退。Repository 使用 `expectedRevision` 进行乐观并发控制。

旧数据导入仅接受调用方完成映射后的合成/脱敏资源 DTO。`idempotencyKey` 确保重复执行返回原报告；导入永远不会根据快照中缺少的记录推断删除。

## 验证

```powershell
npm run data:test
```
