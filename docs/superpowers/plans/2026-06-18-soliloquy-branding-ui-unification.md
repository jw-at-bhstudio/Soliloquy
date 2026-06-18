# Soliloquy Branding UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `Soliloquy` 的品牌、字体、字号与交互文案统一到 `Soliloquy / 独白` 体系，并移除旧命名、硬编码加粗与碎片化字号。

**Architecture:** 方案分为三层推进。第一层先收敛全局字体与字号 token，并补上源码约束测试；第二层替换顶层导航和分析页文案；第三层集中重写镜像页与控制面板文案，并完成全站禁用词和禁用类名清扫。所有验证以 `node:test` 源码约束测试、`npm run lint` 和 `npm run build` 为准。

**Tech Stack:** React 19、TypeScript、Vite 6、Tailwind CSS v4、Node `test`、`tsx`

---

## File Structure

### Create

- `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`
- `d:\Projects\Veritas\docs\superpowers\plans\2026-06-18-soliloquy-branding-ui-unification.md`

### Modify

- `d:\Projects\Veritas\Soliloquy\src\index.css`
- `d:\Projects\Veritas\Soliloquy\src\app\AppShell.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\AnalyzerWorkspace.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerDetailHeader.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerJobList.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\Recorder.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AudioUploader.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\TrackList.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\mirror\MirrorWorkspace.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\FloatingControls.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\VoiceprintCanvas.tsx`

### Existing Verification File

- `d:\Projects\Veritas\Soliloquy\tests\layout.test.ts`

## Shared Constraints

- 品牌区必须采用 `Soliloquy / 独白 / A Key Visual Generator for Self-Dialogue / 为唯理书院 2026 而作`
- `Chelsea Market` 只用于品牌英文主名 `Soliloquy`
- `Noto Sans SC` 作为全站中文界面字体
- `IBM Plex Mono` 只用于数字、西文短标签、参数值、时间、文件格式、技术缩写
- 全站字重统一为 `Regular`
- 禁止新增或保留 `font-bold`、`font-semibold`、`font-medium`
- 全站只保留两级字号：`logo/title` 与 `ui/body`
- 交互区纯中文，仅允许 `JSON`、`SVG` 这类文件格式英文

### Task 1: 建立全局字体与字号约束

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\index.css`
- Create: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`

- [ ] **Step 1: 写出全局约束测试**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('global fonts use Chelsea Market, Noto Sans SC, and IBM Plex Mono', () => {
  assert.match(indexCss, /Chelsea\+Market/);
  assert.match(indexCss, /Noto\+Sans\+SC/);
  assert.match(indexCss, /IBM\+Plex\+Mono/);
});

test('global theme exposes exactly two text size tokens', () => {
  assert.match(indexCss, /--text-title:/);
  assert.match(indexCss, /--text-ui:/);
});

test('global stylesheet does not declare extra font weight tokens', () => {
  assert.doesNotMatch(indexCss, /font-weight:\s*(500|600|700)/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
FAIL global fonts use Chelsea Market, Noto Sans SC, and IBM Plex Mono
```

- [ ] **Step 3: 最小化修改 `index.css` 建立新字体与字号 token**

```css
@import url('https://fonts.googleapis.com/css2?family=Chelsea+Market&family=Noto+Sans+SC:wght@400&family=IBM+Plex+Mono:wght@400&display=swap');
@import "tailwindcss";

@theme {
  --font-brand: "Chelsea Market", cursive;
  --font-sans: "Noto Sans SC", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;

  --text-title: 1rem;
  --text-ui: 0.75rem;
}

body {
  font-family: var(--font-sans);
  font-weight: 400;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
ok 3 - global fonts use Chelsea Market, Noto Sans SC, and IBM Plex Mono
```

- [ ] **Step 5: 提交该任务**

```bash
git add Soliloquy/src/index.css Soliloquy/tests/branding-ui-constraints.test.ts
git commit -m "feat: define soliloquy typography constraints"
```

### Task 2: 统一顶部品牌区与导航文案

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\app\AppShell.tsx`
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`

- [ ] **Step 1: 扩展测试，锁定品牌区与导航口径**

```ts
const appShell = readFileSync(new URL('../src/app/AppShell.tsx', import.meta.url), 'utf8');

test('app shell uses Soliloquy brand copy and pure Chinese navigation labels', () => {
  assert.match(appShell, /Soliloquy/);
  assert.match(appShell, /独白/);
  assert.match(appShell, /A Key Visual Generator for Self-Dialogue/);
  assert.match(appShell, /为唯理书院 2026 而作/);
  assert.match(appShell, />分析</);
  assert.match(appShell, />镜像</);
  assert.doesNotMatch(appShell, /Veritas Unified|A-B 深链接联动|分析工作台|镜像工作台/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
FAIL app shell uses Soliloquy brand copy and pure Chinese navigation labels
```

- [ ] **Step 3: 修改 `AppShell.tsx` 的品牌块与导航标签**

```tsx
<div>
  <div className="font-brand text-title text-white">Soliloquy</div>
  <div className="text-ui text-white">独白</div>
  <div className="text-ui text-white/45">A Key Visual Generator for Self-Dialogue</div>
  <div className="text-ui text-white/45">为唯理书院 2026 而作</div>
</div>

<NavLink to="/analyzer">分析</NavLink>
<NavLink to="/mirror">镜像</NavLink>
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
ok 4 - app shell uses Soliloquy brand copy and pure Chinese navigation labels
```

- [ ] **Step 5: 提交该任务**

```bash
git add Soliloquy/src/app/AppShell.tsx Soliloquy/tests/branding-ui-constraints.test.ts
git commit -m "feat: apply soliloquy brand block to app shell"
```

### Task 3: 收敛分析页标题、区块命名与按钮文案

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\AnalyzerWorkspace.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerDetailHeader.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerJobList.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\Recorder.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AudioUploader.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\TrackList.tsx`
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`

- [ ] **Step 1: 为分析页补充文案与禁用词测试**

```ts
const analyzerWorkspace = readFileSync(new URL('../src/features/analyzer/AnalyzerWorkspace.tsx', import.meta.url), 'utf8');
const analyzerDetailHeader = readFileSync(new URL('../src/features/analyzer/components/AnalyzerDetailHeader.tsx', import.meta.url), 'utf8');

test('analyzer copy uses unified Chinese labels', () => {
  assert.match(analyzerWorkspace, /页标题|分析/);
  assert.match(analyzerWorkspace, /导入声音，生成可继续试听与导出的结果。/);
  assert.match(analyzerWorkspace, /输入/);
  assert.match(analyzerWorkspace, /参数/);
  assert.match(analyzerWorkspace, /波形/);
  assert.match(analyzerWorkspace, /摘要/);
  assert.doesNotMatch(analyzerWorkspace, /THE ANALYZER|批量声学分析工作台/);
  assert.doesNotMatch(analyzerDetailHeader, /当前分析详情|在镜像工作台打开/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
FAIL analyzer copy uses unified Chinese labels
```

- [ ] **Step 3: 修改分析页与支撑组件文案**

```tsx
<h1 className="text-title text-white">分析</h1>
<p className="text-ui text-white/45">导入声音，生成可继续试听与导出的结果。</p>

<span>输入</span>
<span>参数</span>
<span>波形</span>
<span>摘要</span>

<button>导出 JSON</button>
<Link>在镜像中打开</Link>
```

- [ ] **Step 4: 清理英文括注与局部加粗**

```tsx
// Before
<span className="text-xs font-semibold text-white tracking-wider font-mono">
  麦克风采集模块 (MICROPHONE INSTANCE)
</span>

// After
<span className="text-ui text-white">录音</span>
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
ok - analyzer copy uses unified Chinese labels
```

- [ ] **Step 6: 提交该任务**

```bash
git add Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx Soliloquy/src/features/analyzer/components/AnalyzerDetailHeader.tsx Soliloquy/src/features/analyzer/components/AnalyzerJobList.tsx Soliloquy/src/features/analyzer/components/Recorder.tsx Soliloquy/src/features/analyzer/components/AudioUploader.tsx Soliloquy/src/features/analyzer/components/TrackList.tsx Soliloquy/tests/branding-ui-constraints.test.ts
git commit -m "feat: unify analyzer copy and typography"
```

### Task 4: 重写镜像页与镜像控制面板文案

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\MirrorWorkspace.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\FloatingControls.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\VoiceprintCanvas.tsx`
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`

- [ ] **Step 1: 为镜像页补充统一文案测试**

```ts
const mirrorWorkspace = readFileSync(new URL('../src/features/mirror/MirrorWorkspace.tsx', import.meta.url), 'utf8');
const floatingControls = readFileSync(new URL('../src/features/mirror/components/FloatingControls.tsx', import.meta.url), 'utf8');

test('mirror copy removes legacy naming and keeps interaction Chinese-only', () => {
  assert.match(mirrorWorkspace, /镜像/);
  assert.match(mirrorWorkspace, /调整单条结果的形态、试听与输出。/);
  assert.match(mirrorWorkspace, /返回分析/);
  assert.match(mirrorWorkspace, /说明/);
  assert.match(floatingControls, /镜像参数/);
  assert.match(floatingControls, /数据/);
  assert.match(floatingControls, /轨道/);
  assert.match(floatingControls, /形变/);
  assert.match(floatingControls, /绘制/);
  assert.match(floatingControls, /导出/);
  assert.doesNotMatch(mirrorWorkspace, /SPECULAR RUMINATION|镜面反刍|艺术学理说明/);
  assert.doesNotMatch(floatingControls, /ENGINE V1\.3|DATA PIPELINE|TEMPORAL DEFORMATION CORES|ORBIT & DEPICT SPECS/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
FAIL mirror copy removes legacy naming and keeps interaction Chinese-only
```

- [ ] **Step 3: 修改镜像页页头与说明弹层**

```tsx
<div className="text-title text-white">镜像</div>
<div className="text-ui text-white/45">调整单条结果的形态、试听与输出。</div>
<button>返回分析</button>
<button>说明</button>

<h2>说明</h2>
<h3>用途</h3>
<p>用于查看和调整单条结果。</p>
<h3>来源</h3>
<p>可承接分析结果，也可直接导入 JSON。</p>
<h3>输出</h3>
<p>可试听、复制 SVG、继续导出使用。</p>
```

- [ ] **Step 4: 修改镜像控制面板标题与章节名**

```tsx
<h1 className="text-ui text-white">镜像参数</h1>
<label>数据</label>
<label>轨道</label>
<label>形变</label>
<label>绘制</label>
<label>导出</label>

<button>导入 JSON</button>
<button>复制 SVG</button>
<button>{isPlaying ? '停止试听' : '开始试听'}</button>
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
ok - mirror copy removes legacy naming and keeps interaction Chinese-only
```

- [ ] **Step 6: 提交该任务**

```bash
git add Soliloquy/src/features/mirror/MirrorWorkspace.tsx Soliloquy/src/features/mirror/components/FloatingControls.tsx Soliloquy/src/features/mirror/components/VoiceprintCanvas.tsx Soliloquy/tests/branding-ui-constraints.test.ts
git commit -m "feat: unify mirror copy and controls"
```

### Task 5: 全站清扫硬编码字重与碎片化字号

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\app\AppShell.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\AnalyzerWorkspace.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerDetailHeader.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerJobList.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\Recorder.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AudioUploader.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\TrackList.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\MirrorWorkspace.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\FloatingControls.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\VoiceprintCanvas.tsx`
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`

- [ ] **Step 1: 为禁用类名补充源码扫描测试**

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [fullPath] : [];
  });
}

test('source files do not contain forbidden weight or legacy size classes', () => {
  const files = collectFiles(new URL('../src', import.meta.url).pathname);
  const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');

  assert.doesNotMatch(source, /font-bold|font-semibold|font-medium/);
  assert.doesNotMatch(source, /text-\[(9|9\.5|10|11|12)px\]/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
FAIL source files do not contain forbidden weight or legacy size classes
```

- [ ] **Step 3: 用统一类名替换禁用样式**

```tsx
// Before
className="text-[10px] font-mono font-semibold"

// After
className="text-ui text-mono text-white/45"
```

```tsx
// Before
className="text-sm font-semibold tracking-tight"

// After
className="text-title tracking-tight"
```

- [ ] **Step 4: 如有必要，在 `index.css` 添加最小共享工具类**

```css
@utility text-title {
  font-size: var(--text-title);
  line-height: 1.2;
}

@utility text-ui {
  font-size: var(--text-ui);
  line-height: 1.4;
}

@utility text-mono {
  font-family: var(--font-mono);
}

@utility text-brand {
  font-family: var(--font-brand);
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
ok - source files do not contain forbidden weight or legacy size classes
```

- [ ] **Step 6: 提交该任务**

```bash
git add Soliloquy/src/app/AppShell.tsx Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx Soliloquy/src/features/analyzer/components/AnalyzerDetailHeader.tsx Soliloquy/src/features/analyzer/components/AnalyzerJobList.tsx Soliloquy/src/features/analyzer/components/Recorder.tsx Soliloquy/src/features/analyzer/components/AudioUploader.tsx Soliloquy/src/features/analyzer/components/TrackList.tsx Soliloquy/src/features/mirror/MirrorWorkspace.tsx Soliloquy/src/features/mirror/components/FloatingControls.tsx Soliloquy/src/features/mirror/components/VoiceprintCanvas.tsx Soliloquy/src/index.css Soliloquy/tests/branding-ui-constraints.test.ts
git commit -m "refactor: remove hardcoded weights and font sizes"
```

### Task 6: 运行完整验证并整理交付说明

**Files:**
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\layout.test.ts`

- [ ] **Step 1: 运行品牌与文案约束测试**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
# tests 6
# pass 6
```

- [ ] **Step 2: 运行现有布局回归测试**

Run:

```bash
node --import tsx --test tests/layout.test.ts
```

Expected:

```text
# tests 3
# pass 3
```

- [ ] **Step 3: 运行类型检查**

Run:

```bash
npm run lint
```

Expected:

```text
Found 0 errors
```

- [ ] **Step 4: 运行生产构建**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 5: 记录本轮实现完成项**

```md
- 品牌区已切换为 Soliloquy / 独白
- 交互区已统一为中文
- 字体已切换为 Chelsea Market / Noto Sans SC / IBM Plex Mono
- 全站已移除硬编码加粗
- 全站已收敛为两级字号
```

- [ ] **Step 6: 提交最终结果**

```bash
git add Soliloquy/src Soliloquy/tests
git commit -m "feat: unify soliloquy branding and ui language"
```

## Self-Review

### Spec Coverage

- 品牌区双语: Task 2
- 交互区纯中文: Task 3、Task 4
- 字体三分工: Task 1、Task 5
- 两级字号: Task 1、Task 5
- 禁止硬编码加粗: Task 5
- 分析页术语统一: Task 3
- 镜像页术语统一: Task 4
- 禁用旧命名: Task 2、Task 3、Task 4、Task 5
- 验收与验证: Task 6

### Placeholder Scan

- 无 `TBD`、`TODO`、`implement later`
- 所有代码步骤均包含示例代码
- 所有验证步骤均包含精确命令与预期结果

### Type Consistency

- 全局工具类名称统一使用 `text-title`、`text-ui`、`text-mono`、`text-brand`
- 统一术语为 `分析`、`镜像`、`输入`、`参数`、`波形`、`摘要`、`数据`、`轨道`、`形变`、`绘制`、`导出`


