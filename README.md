# Soliloquy

`Soliloquy` 是当前唯一正式维护的前端应用，仓库根目录即应用根目录。

## 仓库结构

- `src`：应用源码
- `tests`：约束与布局测试
- `docs/superpowers`：当前设计与实现文档

## 本地开发

在仓库根目录执行：

```bash
npm install
npm run dev
```

## 验证命令

在仓库根目录执行：

```bash
npm run lint
npm run test
npm run build
```

## Netlify

当前仓库已整理为单层根目录应用，推荐使用以下配置：

- Base directory：留空
- Build command：`npm run build`
- Publish directory：`dist`
