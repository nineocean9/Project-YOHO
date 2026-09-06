# Source Manifest

This directory records provenance before any upstream source is copied into Project-YOHO. The manifest is deliberately separate from the legacy working tree and contains no credentials, patient paths, dataset inventory, model paths, or secret values.

`yoho-source-manifest.json` 当前保持 `imports: []`。这表示 M0 已完成来源记录框架，但尚未导入上游算法代码；它不是 M0 的阻塞项。

## 导入前置条件

在 M4 或其他模块首次导入算法代码前，再补充以下信息：

- exact upstream commit and repository URL;
- license text and hash;
- migration source commit from the clean legacy baseline;
- every imported file and its destination;
- whether the file is unchanged upstream, fork-modified, or new;
- reviewer and review date;
- separate rights confirmation for medical data and model weights.

这些是源码导入、评测和发布前的后续门槛，不影响当前 M0 初始化基线完成。Manifest 不保存凭据、患者路径、数据集清单、模型路径或 secret 值。