# Soliloquy Visual Structure Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一 `Analyzer` 与 `Mirror` 的页面骨架、轻页头、状态条、主区网格、面板层级、按钮层级与 icon 使用规则，让两个页面具备同一产品语法。

**Architecture:** 本轮只改视觉结构，不改业务逻辑。实现分三层推进：先抽共享容器与面板样式工具，再分别收敛 `Analyzer` 与 `Mirror` 页面，最后补充视觉结构约束测试并跑完整验证。所有改动都建立在已完成的品牌、字体、字号规则之上，不重复改动这些基础规范。

**Tech Stack:** React 19、TypeScript、Vite 6、Tailwind CSS v4、Node `test`、`tsx`

---

## File Structure

### Create

- `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`
- `d:\Projects\Veritas\docs\superpowers\plans\2026-06-18-soliloquy-visual-structure-unification.md`

### Modify

- `d:\Projects\Veritas\Soliloquy\src\app\AppShell.tsx`
- `d:\Projects\Veritas\Soliloquy\src\shared\ui\layout.ts`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\AnalyzerWorkspace.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerDetailHeader.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\mirror\MirrorWorkspace.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\FloatingControls.tsx`
- `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\VoiceprintCanvas.tsx`
- `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`

### Existing Verification Files

- `d:\Projects\Veritas\Soliloquy\tests\layout.test.ts`

## Shared Constraints

- 不修改品牌、字体、字号与文案术语基础规则
- 两个页面必须共用相同的内容容器宽度、水平边距与纵向节奏
- 两个页面都采用轻页头
- 视觉层级固定为：`可视化区域 > 主按钮 > 页头 > 其他信息`
- 导航、页头、面板标题默认不使用图标
- `Analyzer` 统计信息必须从页头下沉到状态条
- `Mirror` 必须保留轻页头，不允许反向强化

### Task 1: 抽取共享容器、页头、状态条与面板样式工具

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\shared\ui\layout.ts`
- Create: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`

- [ ] **Step 1: 写出共享视觉结构约束测试**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const layoutUrl = new URL('../src/shared/ui/layout.ts', import.meta.url);

test('layout exports shared page shell helpers for container, header, status strip, and panel', async () => {
  const layout = await readFile(layoutUrl, 'utf8');

  assert.match(layout, /getPageContainerClassName/);
  assert.match(layout, /getPageHeaderClassName/);
  assert.match(layout, /getStatusStripClassName/);
  assert.match(layout, /getPanelClassName/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
FAIL layout exports shared page shell helpers for container, header, status strip, and panel
```

- [ ] **Step 3: 在 `layout.ts` 中增加共享视觉结构工具**

```ts
export function getPageContainerClassName() {
  return 'mx-auto flex w-full max-w-[1600px] flex-1 min-h-0 flex-col overflow-hidden px-4 md:px-6';
}

export function getPageHeaderClassName() {
  return 'flex shrink-0 flex-col gap-3 border-b border-white/10 pb-4';
}

export function getStatusStripClassName() {
  return 'flex flex-wrap items-center gap-2 border-b border-white/5 pb-4 text-white/60';
}

export function getPanelClassName() {
  return 'rounded border border-white/10 bg-[#050505] p-4';
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
ok 1 - layout exports shared page shell helpers for container, header, status strip, and panel
```

- [ ] **Step 5: 提交该任务**

```bash
git add Soliloquy/src/shared/ui/layout.ts Soliloquy/tests/visual-structure-constraints.test.ts
git commit -m "feat: add shared visual shell helpers"
```

### Task 2: 收敛顶层导航与 AppShell 的视觉外壳

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\app\AppShell.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`

- [ ] **Step 1: 扩展测试，锁定导航无图标与更轻的导航容器**

```ts
test('app shell navigation removes decorative icons and keeps lightweight navigation shell', async () => {
  const appShell = await readFile(appShellUrl, 'utf8');

  assert.doesNotMatch(appShell, /AudioLines|Sparkles/);
  assert.doesNotMatch(appShell, /className="[^"]*backdrop-blur[^"]*"/);
  assert.match(appShell, /border-white\/10/);
  assert.match(appShell, /分析/);
  assert.match(appShell, /镜像/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
FAIL app shell navigation removes decorative icons and keeps lightweight navigation shell
```

- [ ] **Step 3: 修改 `AppShell.tsx`，移除导航图标并减轻导航壳层**

```tsx
<nav className="border-b border-white/10 px-4 py-4 md:px-6">
  <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between">
    <div>{/* brand block */}</div>
    <div className="flex items-center gap-1 rounded border border-white/10 p-1">
      <NavLink to="/analyzer">分析</NavLink>
      <NavLink to="/mirror">镜像</NavLink>
    </div>
  </div>
</nav>
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
ok - app shell navigation removes decorative icons and keeps lightweight navigation shell
```

- [ ] **Step 5: 提交该任务**

```bash
git add Soliloquy/src/app/AppShell.tsx Soliloquy/tests/branding-ui-constraints.test.ts
git commit -m "refactor: simplify app shell navigation chrome"
```

### Task 3: 将 Analyzer 重页头改为轻页头并下沉状态条

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\AnalyzerWorkspace.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\analyzer\components\AnalyzerDetailHeader.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`

- [ ] **Step 1: 为 Analyzer 页头与状态条补充结构测试**

```ts
const analyzerWorkspaceUrl = new URL('../src/features/analyzer/AnalyzerWorkspace.tsx', import.meta.url);

test('analyzer uses lightweight header and separate status strip', async () => {
  const analyzer = await readFile(analyzerWorkspaceUrl, 'utf8');

  assert.match(analyzer, /getPageHeaderClassName/);
  assert.match(analyzer, /getStatusStripClassName/);
  assert.doesNotMatch(analyzer, /Activity/);
  assert.doesNotMatch(analyzer, /summary\.total[\s\S]*header/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
FAIL analyzer uses lightweight header and separate status strip
```

- [ ] **Step 3: 修改 `AnalyzerWorkspace.tsx`，将统计从页头下沉到状态条**

```tsx
<div className={getPageContainerClassName()}>
  <header className={getPageHeaderClassName()}>
    <div>
      <h1 style={{ fontSize: 'var(--text-title)' }}>分析</h1>
      <p style={{ fontSize: 'var(--text-ui)' }}>导入声音，生成可继续试听与导出的结果。</p>
    </div>
  </header>

  <div className={getStatusStripClassName()}>
    <span>总数 <span style={{ fontFamily: 'var(--font-mono)' }}>{summary.total}</span></span>
    <span>排队 <span style={{ fontFamily: 'var(--font-mono)' }}>{summary.queued}</span></span>
    <span>处理中 <span style={{ fontFamily: 'var(--font-mono)' }}>{summary.processing}</span></span>
    <span>可导出 <span style={{ fontFamily: 'var(--font-mono)' }}>{summary.ready}</span></span>
  </div>
</div>
```

- [ ] **Step 4: 将 `AnalyzerDetailHeader.tsx` 视觉层级降为工作面板**

```tsx
<div className={getPanelClassName()}>
  <div className="flex items-center justify-between">
    <div>当前结果</div>
    <div className="flex gap-2">
      <button>{/* 导出 JSON */}</button>
      <button>{/* 在镜像中打开 */}</button>
    </div>
  </div>
</div>
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
ok - analyzer uses lightweight header and separate status strip
```

- [ ] **Step 6: 提交该任务**

```bash
git add Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx Soliloquy/src/features/analyzer/components/AnalyzerDetailHeader.tsx Soliloquy/tests/visual-structure-constraints.test.ts
git commit -m "refactor: lighten analyzer header and extract status strip"
```

### Task 4: 收敛 Mirror 页头、状态条与右侧控制区结构

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\MirrorWorkspace.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\FloatingControls.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\src\features\mirror\components\VoiceprintCanvas.tsx`
- Modify: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`

- [ ] **Step 1: 为 Mirror 页头和控制区补充结构测试**

```ts
const mirrorWorkspaceUrl = new URL('../src/features/mirror/MirrorWorkspace.tsx', import.meta.url);
const floatingControlsUrl = new URL('../src/features/mirror/components/FloatingControls.tsx', import.meta.url);

test('mirror keeps lightweight header and moves source metadata into status strip', async () => {
  const mirror = await readFile(mirrorWorkspaceUrl, 'utf8');

  assert.match(mirror, /getPageHeaderClassName/);
  assert.match(mirror, /getStatusStripClassName/);
  assert.doesNotMatch(mirror, /来源：\{sourceLabel\}[\s\S]*header/);
});

test('mirror controls are organized as grouped secondary panels and primary actions', async () => {
  const controls = await readFile(floatingControlsUrl, 'utf8');

  assert.match(controls, /镜像参数/);
  assert.match(controls, /开始试听|停止试听/);
  assert.match(controls, /复制[\s\S]*SVG/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
FAIL mirror keeps lightweight header and moves source metadata into status strip
```

- [ ] **Step 3: 修改 `MirrorWorkspace.tsx`，将来源与元数据移入状态条**

```tsx
<div className={getPageContainerClassName()}>
  <header className={getPageHeaderClassName()}>
    <div>
      <div style={{ fontSize: 'var(--text-title)' }}>镜像</div>
      <div style={{ fontSize: 'var(--text-ui)' }}>调整单条结果的形态、试听与输出。</div>
    </div>
    <div>{/* 返回分析 / 说明 */}</div>
  </header>

  <div className={getStatusStripClassName()}>
    <span>来源 <span style={{ fontFamily: 'var(--font-mono)' }}>{sourceLabel}</span></span>
    <span>时长 <span style={{ fontFamily: 'var(--font-mono)' }}>{voiceprint.duration.toFixed(2)}s</span></span>
    <span>帧数 <span style={{ fontFamily: 'var(--font-mono)' }}>{voiceprint.sampleCount}</span></span>
  </div>
</div>
```

- [ ] **Step 4: 修改 `FloatingControls.tsx`，将控制区视觉上拆成三组次级面板**

```tsx
<div className={getPanelClassName()}>
  <section>{/* 数据 / 轨道 */}</section>
</div>

<div className={getPanelClassName()}>
  <section>{/* 形变 / 绘制 */}</section>
</div>

<div className={getPanelClassName()}>
  <section>{/* 开始试听 / 复制 SVG */}</section>
</div>
```

- [ ] **Step 5: 降低 `VoiceprintCanvas.tsx` 的 HUD 感，保留必要数值信息**

```tsx
<div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-4 py-3 text-white/55">
  <span>缩放 <span style={{ fontFamily: 'var(--font-mono)' }}>{zoom.toFixed(2)}×</span></span>
  <span>偏移 <span style={{ fontFamily: 'var(--font-mono)' }}>{pan.x.toFixed(0)} / {pan.y.toFixed(0)}</span></span>
</div>
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
ok - mirror keeps lightweight header and moves source metadata into status strip
ok - mirror controls are organized as grouped secondary panels and primary actions
```

- [ ] **Step 7: 提交该任务**

```bash
git add Soliloquy/src/features/mirror/MirrorWorkspace.tsx Soliloquy/src/features/mirror/components/FloatingControls.tsx Soliloquy/src/features/mirror/components/VoiceprintCanvas.tsx Soliloquy/tests/visual-structure-constraints.test.ts
git commit -m "refactor: unify mirror shell and control panel hierarchy"
```

### Task 5: 统一面板、按钮与 icon 规则的源码约束

**Files:**
- Modify: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`
- Modify: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`

- [ ] **Step 1: 写出 icon 与页面结构的回归测试**

```ts
test('app shell, page headers, and panel headings do not use decorative icons', async () => {
  const [appShell, analyzer, mirror] = await Promise.all([
    readFile(new URL('../src/app/AppShell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/analyzer/AnalyzerWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/mirror/MirrorWorkspace.tsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(appShell, /AudioLines|Sparkles/);
  assert.doesNotMatch(analyzer, /Activity|HelpCircle/);
  assert.doesNotMatch(mirror, /Sparkles|HelpCircle/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
FAIL app shell, page headers, and panel headings do not use decorative icons
```

- [ ] **Step 3: 清理页头与面板标题中的装饰性 icon**

```tsx
// Before
<div className="flex items-center gap-3">
  <Activity />
  <h1>分析</h1>
</div>

// After
<div>
  <h1>分析</h1>
</div>
```

```tsx
// Before
<button><HelpCircle />说明</button>

// After
<button>说明</button>
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
ok - app shell, page headers, and panel headings do not use decorative icons
```

- [ ] **Step 5: 提交该任务**

```bash
git add Soliloquy/src/app/AppShell.tsx Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx Soliloquy/src/features/mirror/MirrorWorkspace.tsx Soliloquy/tests/visual-structure-constraints.test.ts Soliloquy/tests/branding-ui-constraints.test.ts
git commit -m "test: lock visual structure and icon usage rules"
```

### Task 6: 运行完整验证并整理交付结果

**Files:**
- Test: `d:\Projects\Veritas\Soliloquy\tests\branding-ui-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\visual-structure-constraints.test.ts`
- Test: `d:\Projects\Veritas\Soliloquy\tests\layout.test.ts`

- [ ] **Step 1: 运行品牌与文字约束测试**

Run:

```bash
node --import tsx --test tests/branding-ui-constraints.test.ts
```

Expected:

```text
# pass 7
```

- [ ] **Step 2: 运行视觉结构约束测试**

Run:

```bash
node --import tsx --test tests/visual-structure-constraints.test.ts
```

Expected:

```text
# pass 5
```

- [ ] **Step 3: 运行布局回归测试**

Run:

```bash
node --import tsx --test tests/layout.test.ts
```

Expected:

```text
# pass 3
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
npm run lint
```

Expected:

```text
Found 0 errors
```

- [ ] **Step 5: 运行生产构建**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 6: 记录本轮完成项**

```md
- 两个页面已采用轻页头
- Analyzer 统计信息已下沉到状态条
- 两个页面已共享统一内容容器与纵向节奏
- Mirror 控制区已收敛为统一的次级面板组
- 导航、页头与面板标题的装饰性 icon 已清理
```

- [ ] **Step 7: 提交最终结果**

```bash
git add Soliloquy/src Soliloquy/tests
git commit -m "refactor: unify visual structure across analyzer and mirror"
```

## Self-Review

### Spec Coverage

- 统一页面骨架：Task 1、Task 3、Task 4
- 轻页头：Task 3、Task 4
- 状态条：Task 3、Task 4
- 共享容器与节奏：Task 1、Task 3、Task 4
- 面板语义：Task 1、Task 3、Task 4
- 按钮层级：Task 3、Task 4
- icon 去装饰化：Task 2、Task 5
- 完整验证：Task 6

### Placeholder Scan

- 无 `TBD`、`TODO`、`implement later`
- 每个任务均包含精确文件、代码片段、命令与预期结果

### Type Consistency

- 共享工具名称固定为 `getPageContainerClassName`、`getPageHeaderClassName`、`getStatusStripClassName`、`getPanelClassName`
- 页面结构统一使用 `轻页头 -> 状态条 -> 主工作区`


