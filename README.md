# Soliloquy

`Soliloquy` 是当前唯一正式维护的应用目录，位于 `d:\Projects\Veritas\Soliloquy`。

## 仓库结构

- `Soliloquy`：正式前端应用，使用 `Vite + React + TypeScript + Tailwind CSS`
- `docs/superpowers`：当前设计与实现文档
- `.trae`：本地代理工作文档

## 本地开发

在 `Soliloquy` 目录执行：

```bash
npm install
npm run dev
```

## 验证命令

在 `Soliloquy` 目录执行：

```bash
npm run lint
npm run test
npm run build
```

## Netlify

本仓库已按子目录部署方式整理，推荐使用以下配置：

- Base directory: `Soliloquy`
- Build command: `npm run build`
- Publish directory: `dist`
