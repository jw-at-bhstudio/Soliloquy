# Soliloquy Branding And UI Unification Design

## Background

当前 unified 应用已经形成统一的暗色气质，但仍并存多套命名、术语、文案语气、字体职责与字号层级。现有界面同时出现 `Veritas Unified`、`THE ANALYZER`、`SPECULAR RUMINATION`、`镜面反刍` 等开发期或原型期命名，导致品牌识别、页面标题和控件语言无法收敛。

本设计文档用于确定一套唯一的品牌与界面语言系统，作为后续实现与验收依据。

## Goal

- 将应用正式品牌统一为 `Soliloquy / 独白`
- 将品牌口径与 UI 文案同时收敛，消除术语漂移
- 将全站字体系统收敛为 1 个中文字体、1 个等宽字体、1 个 Logo 字体
- 将全站字号收敛为仅 2 级
- 将字重策略统一为 `Regular`，禁止通过硬编码加粗制造层级
- 将交互语言统一为中文，仅在品牌区保留英文信息

## Non-Goals

- 不在本次设计中改动核心业务逻辑
- 不在本次设计中扩展新功能或新增页面
- 不重新设计整体布局结构，仅统一品牌、文案、字体、字号和视觉语言
- 不保留历史命名兼容层

## Approved Brand Source

本设计以 [2026-06-18-app-naming-proposals.md](file:///d:/Projects/Veritas/docs/superpowers/specs/2026-06-18-app-naming-proposals.md#L116-L132) 中的已批准命名为唯一来源。

- APP 名-英: `Soliloquy`
- APP 名-中: `独白`
- APP 副标题-英: `A Key Visual Generator for Self-Dialogue`
- APP 副标题-中: `「与自我对话」主视觉生成器`
- 附加信息-英: `Made for Veritas Academy 2026`
- 附加信息-中: `为唯理书院 2026 而作`

## Core Decision

采用 `方案 A`:

- 品牌区双语
- 交互区纯中文
- 英文只服务于品牌识别，不进入常规交互文案层

此决策用于解决当前界面中英文信息扩散、术语混用、标题层级混乱的问题，并确保在仅保留 2 级字号的前提下仍能维持足够清晰的信息结构。

## Typography System

### Font Roles

- Logo 字体: `Chelsea Market`
- 中文界面字体: `Noto Sans SC`
- 等宽字体: `IBM Plex Mono`

### Usage Rules

- `Chelsea Market` 只允许用于品牌英文主名 `Soliloquy`
- `Noto Sans SC` 用于全站中文标题、正文、按钮、说明、状态与一般英文
- `IBM Plex Mono` 只用于数字、西文短标签、参数值、时间、文件格式、技术缩写

### Weight Rules

- 全站字重统一为 `Regular`
- 禁止在组件内硬编码 `font-bold`、`font-semibold`、`font-medium`
- 禁止使用数值字重如 `500`、`600`、`700`
- 禁止依赖字重建立视觉层级

### Size Rules

全站只允许 2 级字号:

- 一级字号: 仅用于 APP Logo 与页标题
- 二级字号: 用于其余全部文字

### Emphasis Rules

信息强调只能通过以下方式建立:

- 颜色对比
- 留白
- 信息位置
- 信息分组
- 文案长度控制

不得通过额外字号层级或额外字重建立新的视觉等级。

## Brand Presentation

### Brand Block Content

品牌区采用如下固定写法:

1. `Soliloquy`
2. `独白`
3. `A Key Visual Generator for Self-Dialogue`
4. `为唯理书院 2026 而作`

### Brand Block Rules

- 顶部品牌区完整展示一次即可
- 页面内部不重复完整品牌副标题
- 不再保留 `Veritas Unified` 作为任何页面标题、导航标题或容器标题
- 不再保留以开发组织结构为中心的说明文案

## Language System

### Global Rule

- 品牌区双语
- 交互区纯中文

### English Allowlist

英文允许出现在以下场景:

- 品牌区固定文案
- 文件格式，如 `JSON`、`SVG`
- 参数值或技术缩写，且必须使用等宽字体

除上述场景外，导航、按钮、面板标题、状态、说明、空状态、弹层正文均为中文。

## Terminology Rules

### Product-Level Naming

- `分析工作台` 统一为 `分析`
- `镜像工作台` 统一为 `镜像`

### Panel-Level Naming

- 面板标题统一为 1 至 4 个中文字
- 不使用 `工具`、`引擎`、`模块`、`实例`、`工作台` 等混杂后缀

### Action Naming

- 操作类文案统一为 `动词 + 对象`
- 示例: `导入 JSON`、`复制 SVG`、`返回分析`、`开始录音`

### Status Naming

- 状态类文案统一为短中文
- 示例: `排队中`、`分析中`、`已完成`、`失败`、`未选择`

## Canonical Terminology Mapping

- `分析工作台` -> `分析`
- `镜像工作台` -> `镜像`
- `批量声学分析工作台` -> `分析`
- `当前分析详情` -> `当前结果`
- `批处理任务列表` -> `任务列表`
- `音频信号源采集` -> `输入`
- `当前入队参数` -> `参数`
- `分析提取基本原理` -> `原理`
- `当前任务摘要` -> `摘要`
- `镜面反刍声纹参数化绘制工具` -> `镜像参数`
- `艺术学理说明` -> `说明`
- `数据流管理` -> `数据`
- `通道轨道阶数` -> `轨道`
- `右侧时域反刍变形` -> `形变`
- `视口与渲染调整` -> `绘制`
- `动力播放与 SVG 导出` -> `导出`
- `立体声合奏` -> `试听`
- `在镜像工作台打开` -> `在镜像中打开`
- `返回分析工作台` -> `返回分析`
- `导出当前 JSON` -> `导出 JSON`
- `一键复制矢量 SVG (AI/Figma 可用)` -> `复制 SVG`

## Forbidden Legacy Wording

以下表达禁止继续保留在界面中:

- `Veritas Unified`
- `单一入口 / 统一导航 / A-B 深链接联动`
- `THE ANALYZER`
- `SPECULAR RUMINATION`
- `ENGINE V1.3`
- `TEMPORAL DEFORMATION CORES`
- `ORBIT & DEPICT SPECS`
- `镜面反刍`

## Page-Level Copy Specification

### Top Navigation

适用文件: [AppShell.tsx](file:///d:/Projects/Veritas/Soliloquy/src/app/AppShell.tsx)

- 品牌区替换为固定品牌块
- 导航项只保留 `分析` 与 `镜像`
- 删除工程视角副标题

### Analyzer Page

适用文件: [AnalyzerWorkspace.tsx](file:///d:/Projects/Veritas/Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx)

- 页标题: `分析`
- 页说明: `导入声音，生成可继续试听与导出的结果。`
- 顶部统计标签统一为 `总数`、`排队`、`处理中`、`可导出`
- `1. 音频信号源采集` -> `输入`
- `2. 当前入队参数` -> `参数`
- `3. 当前条目多频波动示波器` -> `波形`
- `4. 当前任务摘要` -> `摘要`
- `分析提取基本原理` -> `原理`

### Analyzer Supporting Components

适用文件:

- [AnalyzerDetailHeader.tsx](file:///d:/Projects/Veritas/Soliloquy/src/features/analyzer/components/AnalyzerDetailHeader.tsx)
- [AnalyzerJobList.tsx](file:///d:/Projects/Veritas/Soliloquy/src/features/analyzer/components/AnalyzerJobList.tsx)
- [Recorder.tsx](file:///d:/Projects/Veritas/Soliloquy/src/features/analyzer/components/Recorder.tsx)

统一要求:

- 标题改为短中文
- 按钮改为 `动词 + 对象`
- 删除英文括注型副标题
- 保留必要技术对象名如 `JSON`

### Mirror Page

适用文件: [MirrorWorkspace.tsx](file:///d:/Projects/Veritas/Soliloquy/src/features/mirror/MirrorWorkspace.tsx)

- 页标题: `镜像`
- 页说明: `调整单条结果的形态、试听与输出。`
- `返回分析工作台` -> `返回分析`
- `艺术学理说明` -> `说明`
- 删除 `SPECULAR RUMINATION`
- 删除以旧模块代号和原型命名为中心的叙述

### Mirror Explanation Modal

适用文件: [MirrorWorkspace.tsx](file:///d:/Projects/Veritas/Soliloquy/src/features/mirror/MirrorWorkspace.tsx#L209-L255)

说明弹层压缩为 3 段:

1. 用途: 用于查看和调整单条结果
2. 来源: 可承接分析结果，也可直接导入 JSON
3. 输出: 可试听、复制 SVG、继续导出使用

不得出现 `A`、`B`、`深链接联动` 等工程视角叙述。

### Mirror Controls

适用文件: [FloatingControls.tsx](file:///d:/Projects/Veritas/Soliloquy/src/features/mirror/components/FloatingControls.tsx)

- 主标题统一为 `镜像参数`
- 删除版本号式英文副标题
- `数据流管理` -> `数据`
- `通道轨道阶数` -> `轨道`
- `右侧时域反刍变形` -> `形变`
- `视口与渲染调整` -> `绘制`
- `动力播放与 SVG 导出` -> `导出`
- 控件标签与辅助说明统一为纯中文
- 保留 `JSON`、`SVG` 作为文件格式名

该文件为本次文案和视觉语言统一的最高优先级重构目标。

## Visual Consistency Rules

- 所有面板标题使用二级字号
- 所有按钮文字使用二级字号
- 所有说明文字使用二级字号
- 所有状态与计数使用二级字号
- 只有 APP Logo 和页标题可以使用一级字号

这意味着当前 UI 中碎片化的 `9px`、`10px`、`11px`、`12px` 需要在实现阶段整体收敛。

## Error Handling And Edge Cases

- 若某处英文为文件格式或必要技术对象名，则保留，但必须限制在局部功能语义内
- 若某处现有文案无法在短中文内表达，则优先拆为标题与一句说明，而不是恢复长英文括注
- 若某组件通过字重表达选中态，则实现阶段必须改为通过底色、边框或颜色对比表达

## Testing And Verification

实现验收需覆盖以下检查项:

- 品牌区是否完整采用 `Soliloquy / 独白` 口径
- 全站是否只保留 2 级字号
- 全站是否移除硬编码加粗
- 中文正文是否统一为 `Noto Sans SC`
- 数字与西文技术标签是否统一为 `IBM Plex Mono`
- `Chelsea Market` 是否仅用于 `Soliloquy`
- 导航、按钮、面板标题、状态、说明是否均为中文
- 禁用词与旧术语是否已全部移除

## Implementation Boundary

后续实现只围绕以下范围展开:

- 更新全局字体导入与字体 token
- 收敛字号 token 到 2 级
- 替换全站品牌文案与术语
- 收敛页面与面板标题
- 收敛按钮、说明、状态、弹层文案

不在本轮实现中新增功能或调整核心数据流。

