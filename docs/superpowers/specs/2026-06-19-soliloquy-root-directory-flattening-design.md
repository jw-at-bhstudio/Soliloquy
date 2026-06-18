# Soliloquy Root Directory Flattening Design

**Date:** 2026-06-19

**Goal:** 将当前 `Soliloquy/Soliloquy` 的双层结构整理为“仓库根目录即正式应用根目录”，同时保留 `docs/` 作为仓库级文档目录，并确保现有 GitHub 与后续 Netlify 部署配置保持可用。

---

## 1. 背景

当前仓库已经完成以下收敛：

- 历史项目目录已移除
- 正式应用已经统一命名为 `Soliloquy`
- GitHub 仓库已经初始化并推送到远程
- Netlify 配置已经存在

但当前目录结构仍为：

```text
Soliloquy/
├─ Soliloquy/
│  ├─ src/
│  ├─ tests/
│  ├─ package.json
│  ├─ vite.config.ts
│  └─ ...
├─ docs/
├─ README.md
├─ .gitignore
└─ netlify.toml
```

这会带来几个问题：

- 仓库名与正式应用目录名重复，认知成本偏高
- Netlify 当前需要配置 `Base directory`
- 本地命令执行路径不够直观
- GitHub 首页不够像一个单层的正式前端项目

因此，本次整理目标是将应用文件提升到仓库根目录，同时保留 `docs/` 作为辅助目录。

---

## 2. 目标结构

整理完成后的仓库结构应为：

```text
Soliloquy/
├─ src/
├─ tests/
├─ docs/
│  └─ superpowers/
├─ package.json
├─ package-lock.json
├─ vite.config.ts
├─ tsconfig.json
├─ index.html
├─ README.md
├─ .gitignore
└─ netlify.toml
```

约束如下：

- 仓库根目录即应用根目录
- `docs/` 保留在仓库根目录，不并入 `src/`
- 不再保留任何嵌套的应用主目录
- GitHub 远程仓库地址保持不变

---

## 3. 方案选择

本次采用的方案是：

### 方案 A：应用提升到仓库根，保留 docs

执行原则：

- 将当前内层 `Soliloquy/` 的全部应用文件提升到仓库根
- 保留现有 `docs/` 不动
- 保留仓库根的 `.gitignore`、`README.md`、`netlify.toml`，并按新结构修正内容
- 迁移后重新执行验证与 Git 提交

选择该方案的原因：

- 结构最直观，最利于 GitHub 展示
- 最适合当前“单应用仓库”的状态
- 不丢设计文档
- Netlify 配置可以进一步简化

明确不采用的方案：

- 保留双层结构但改名为 `web/` 或 `app/`
- 删除 `docs/` 以换取极致纯净结构

---

## 4. 实施边界

本次整理只做目录结构与部署入口收口，不改业务行为：

- 不修改分析与镜像功能逻辑
- 不重构算法模块
- 不调整 UI 结构与文案体系
- 不引入数据库或服务端逻辑

允许修改的范围：

- 根目录与应用目录文件位置
- `README.md`
- `netlify.toml`
- `.gitignore`
- 任何因路径变化而必须同步的项目配置

---

## 5. 文件迁移设计

需要从当前内层应用目录提升到仓库根的内容包括：

- `src/`
- `tests/`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `tsconfig.json`
- `index.html`

迁移后需要删除的旧目录：

- 空的内层 `Soliloquy/` 目录

迁移策略：

1. 先读取并确认根目录与内层目录的现有文件
2. 将应用文件移动到仓库根
3. 删除空的内层目录
4. 修正根目录文档与部署配置
5. 执行完整验证

---

## 6. 配置调整设计

### README

根级 `README.md` 需要更新为：

- 仓库根即应用根
- 本地运行命令在仓库根执行
- 不再提及 `Soliloquy` 子目录作为应用基准目录

### .gitignore

根级 `.gitignore` 需要更新为：

- 保留通用忽略项，如 `node_modules/`、`dist/`
- 删除仅适用于旧双层结构的 `Soliloquy/node_modules/` 与 `Soliloquy/dist/`

### netlify.toml

根级 `netlify.toml` 需要简化为根目录构建模式：

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

即：

- 不再设置 `base = "Soliloquy"`
- 让 Netlify 直接以仓库根目录作为应用根

---

## 7. 验证设计

迁移完成后，必须在仓库根目录执行：

```bash
npm install
npm run lint
npm run test
npm run build
```

验证目标：

- 依赖安装正常
- TypeScript 无报错
- 现有测试全部通过
- Vite 构建成功
- 构建产物生成于根级 `dist/`

附加检查：

- `README.md` 中命令路径与实际结构一致
- `netlify.toml` 不再引用旧的 `Base directory`
- Git 工作区最终仅包含预期变更

---

## 8. Git 与部署设计

### Git

本次整理在现有仓库中直接进行，不重新建仓。

预期流程：

1. 移动文件
2. 修正配置
3. 重新验证
4. 创建一次结构整理提交
5. 推送到现有 `origin/main`

### Netlify

整理完成后，Netlify 应采用根目录部署：

- Repository: `jw-at-bhstudio/Soliloquy`
- Base directory: 留空
- Build command: `npm run build`
- Publish directory: `dist`

---

## 9. 风险与处理

### 风险 1：移动文件后脚本路径失效

处理：

- 逐项检查 `package.json`、`vite.config.ts`、测试脚本与引用路径

### 风险 2：根目录已有同名文件冲突

处理：

- 先读取当前根目录文件，再执行移动，避免覆盖 `README.md`、`.gitignore`、`netlify.toml`

### 风险 3：Netlify 仍沿用旧配置

处理：

- 同步更新 `netlify.toml`
- 在最终交付说明中明确 Netlify 的新配置

### 风险 4：Git 记录看起来像大规模删除加新增

处理：

- 接受该次提交作为结构整理提交，不做额外历史清洗

---

## 10. 成功标准

本次整理完成后，应同时满足：

- 仓库根目录直接可执行 `npm install`、`npm run dev`、`npm run build`
- 不再存在 `Soliloquy/Soliloquy` 双层应用结构
- `docs/` 仍保留在仓库中
- GitHub 远程仓库保持可用
- Netlify 可以直接从仓库根目录构建
