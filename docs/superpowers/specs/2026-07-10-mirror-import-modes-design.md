# Mirror Import Modes Design

## 背景

当前镜像页已经支持两条导入能力：

- 导入单份声纹 JSON
- 导入单份问卷结果 JSON

但这两条能力目前都属于“单次覆盖当前状态”的简单导入，不满足以下新的实际使用场景：

1. 一次导入多份问卷 JSON 与多份声纹 JSON，并按“同一人”快速切换查看
2. 不做匹配，只把任意单份问卷 JSON 与任意单份声纹 JSON 临时组合进行观察
3. 在 UI 中清楚看到当前到底导入了哪个文件

## 目标

### 目标 1：在镜像页内支持两种导入模式

镜像页新增两个明确的导入模式：

- `A：批量匹配模式`
- `B：随意单测模式`

两者都在镜像页内部完成，不拆成两个独立路由。

### 目标 2：两种模式完全互斥

`A/B` 模式不是并行工作台，而是互斥工作模式：

- 切换到 `A` 时，清空 `B` 模式数据
- 切换到 `B` 时，清空 `A` 模式数据

### 目标 3：默认进入批量匹配模式

镜像页进入时：

- 默认模式为 `A：批量匹配`

但页面顶部必须有显眼的模式切换条，使用户可以随时切换到 `B：随意单测`。

### 目标 4：A 模式按文件名首段配对

批量匹配模式中，问卷 JSON 与声纹 JSON 的配对规则固定为：

- 取文件 basename
- 取第一个 `-` 之前的内容
- 该内容作为匹配 key

例如：

- `陈昱彤-组委-问卷数据.json` → key = `陈昱彤`
- `陈昱彤-组委-图像.v4.voiceprint.json` → key = `陈昱彤`

两边 key 相同，即视为同一人。

### 目标 5：B 模式清楚显示当前文件名

随意单测模式中：

- 声纹 JSON 与问卷 JSON 可分别独立导入任意符合要求的单份文件
- UI 必须明确显示当前声纹文件名与当前问卷文件名
- 两侧各自支持清空

## 非目标

- 本轮不修改声纹 JSON 或问卷 JSON 的内部结构
- 本轮不依赖 JSON 内部字段进行配对
- 本轮不引入模糊匹配或复杂规则匹配
- 本轮不把镜像页拆分成多个顶级路由
- 本轮不在模式切换时保留上一模式的导入数据
- 本轮不增加“最近导入文件列表”

## 总体交互结构

镜像页在导入区顶部新增一个模式切换条：

- `批量匹配`
- `随意单测`

默认高亮：

- `批量匹配`

模式切换行为：

- 切换模式时，立即清空另一模式的数据
- 切换后只渲染当前模式对应的导入面板

## 模式 A：批量匹配

### 输入

批量匹配模式提供两块多文件导入入口：

- `导入问卷 JSON（多选）`
- `导入声纹 JSON（多选）`

### 配对规则

定义：

```text
matchKey = basename.split('-')[0]
```

如果文件名中没有 `-`，则：

- 整个 basename 作为 key

### 结果列表

导入后生成一份匹配结果列表，每项至少包含：

- `key`
- `questionnaireFileName | null`
- `voiceprintFileName | null`
- `status`

其中 `status` 只能是：

- `paired`
- `missing-questionnaire`
- `missing-voiceprint`

### 列表显示

每个条目至少显示：

- 人名 key
- 问卷状态：`已匹配 / 缺问卷`
- 声纹状态：`已匹配 / 缺声纹`
- 当前选中态

### 点击行为

#### 1. 点击已配对条目

如果条目同时拥有问卷与声纹：

- 当前镜像画布切换到该声纹
- 同时应用该条目的问卷预设

#### 2. 点击缺问卷条目

如果条目只有声纹，没有问卷：

- 当前镜像画布切换到该声纹
- 当前问卷预设显示被清空

这样可以避免误把上一个条目的问卷状态继续沿用到当前声纹。

#### 3. 点击缺声纹条目

如果条目只有问卷，没有声纹：

- 不切换当前画布
- 条目允许被选中高亮
- UI 显示“缺少声纹文件，无法切换画布”

## 模式 B：随意单测

### 输入

提供两块独立的单文件导入入口：

- `导入声纹 JSON`
- `导入问卷 JSON`

两者之间不做匹配要求。

### 行为

- 导入声纹 JSON：只更新当前声纹
- 导入问卷 JSON：只更新当前问卷映射

### 文件名显示

UI 必须明确显示：

- 当前声纹文件名
- 当前问卷文件名

如果某一侧尚未导入，则显示空状态文案。

### 清空

两侧各自拥有单独清空能力：

- 清空声纹：重置当前声纹文件名与该模式下的声纹导入数据
- 清空问卷：重置当前问卷文件名与该模式下的问卷导入数据

清空一侧不应影响另一侧。

## 状态模型

导入状态不应再散落在当前控制面板回调里，而应被抽象成独立的导入模式状态。

建议使用互斥联合类型：

```ts
type MirrorImportMode = 'paired-batch' | 'single-free';

type PairedImportEntryStatus =
  | 'paired'
  | 'missing-questionnaire'
  | 'missing-voiceprint';

type PairedImportEntry = {
  key: string;
  questionnaireFileName: string | null;
  voiceprintFileName: string | null;
  questionnaireRecords: MirrorPresetRecord[];
  voiceprintData: VoiceprintData | null;
  status: PairedImportEntryStatus;
};

type MirrorImportState =
  | {
      mode: 'paired-batch';
      entries: PairedImportEntry[];
      selectedEntryKey: string | null;
    }
  | {
      mode: 'single-free';
      voiceprintFileName: string | null;
      questionnaireFileName: string | null;
      voiceprintData: VoiceprintData | null;
      questionnaireRecords: MirrorPresetRecord[];
    };
```

模式切换时直接替换整个 `MirrorImportState`，从而保证两种模式完全互斥。

## 文件解析与匹配边界

### 问卷 JSON

继续沿用现有：

- `parseQuestionnairePresets()`

用于把问卷 JSON 转为 `MirrorPresetRecord[]`。

### 声纹 JSON

继续沿用现有：

- `validateAndParseVoiceprint()`

用于把声纹 JSON 解析为 `VoiceprintData`。

### 匹配时机

批量匹配模式中，导入问卷文件或声纹文件后：

- 先各自解析
- 再按 key 合并成 `entries`

这意味着：

- 问卷与声纹的导入顺序不重要
- 任一侧先导入都可以

## 当前画布驱动规则

镜像页仍然只有一套当前画布，因此需要把“导入模式状态”与“当前画布状态”分开：

- 导入模式状态负责记录当前有哪些文件与条目
- 当前画布状态仍由 `MirrorWorkspace` 现有的 `voiceprint / presetRecords / selectedPreset...` 驱动

桥接规则如下：

### 批量匹配模式

- 点击条目时，根据条目内容更新当前画布与问卷预设状态

### 随意单测模式

- 导入单份声纹时，更新当前画布
- 导入单份问卷时，更新当前问卷预设状态

## 组件边界

本轮不建议继续把全部逻辑堆入当前 `FloatingControls.tsx`，应拆出导入模式相关模块。

建议拆分为以下职责：

### `imports/types.ts`

定义：

- `MirrorImportMode`
- `MirrorImportState`
- `PairedImportEntry`
- `PairedImportEntryStatus`

### `imports/matching.ts`

负责：

- 从文件名提取匹配 key
- 组合问卷文件与声纹文件为 `PairedImportEntry[]`

### `components/MirrorModeSwitch.tsx`

负责：

- 顶部 `A/B` 模式切换条

### `components/PairedBatchImportPanel.tsx`

负责：

- 两个多文件导入按钮
- 匹配结果列表
- 条目点击行为

### `components/SingleFreeImportPanel.tsx`

负责：

- 两个单文件导入按钮
- 当前文件名显示
- 各自清空

### `FloatingControls.tsx`

保留已有控制、播放、SVG 复制与参数区，但不再直接承载复杂的模式状态与配对逻辑。

## 默认模式与初始化

镜像页初始化时：

- 默认模式为 `paired-batch`

因此进入镜像页后：

- 用户首先看到批量匹配导入 UI
- 但可以通过顶部模式切换条改用随意单测模式

## 验证标准

### 结构验证

- 镜像页默认显示批量匹配模式
- 模式切换条始终可见
- 两种模式对应的 UI 面板不会同时显示

### 行为验证

- A 模式支持多文件导入并按 key 正确配对
- A 模式未配对条目会明确显示状态
- A 模式点击不同状态条目时行为符合设计
- B 模式显示当前文件名
- B 模式清空单侧时不影响另一侧
- 切换模式时会清空上一模式状态

### 数据验证

- 配对只依赖文件名 key 提取规则
- 问卷与声纹导入顺序不影响 A 模式最终结果
- 不因某条目缺配对而阻断整批导入

## 风险与边界

### 风险 1：文件名规范依赖较强

本设计依赖“第一个 `-` 前的内容就是人名 key”这一约定。

只要文件清理归档流程保持一致，该规则是稳定可用的；如果未来文件名规范改变，则需要同步调整匹配器。

### 风险 2：问卷 JSON 可能是一份文件内多条记录

本设计默认把“文件名”作为批量导入中的外层匹配单位，因此如果未来问卷导出格式不再是一人一文件，而是多人合并文件，则需要重新定义 A 模式输入规范。

### 风险 3：缺声纹条目无法直接切换画布

这是符合语义的限制，而不是 bug。该情况下 UI 应明确提示“缺少声纹文件，无法切换画布”。

## 结论

本次设计为镜像页新增一套清晰、互斥的双模式导入机制：

- `A：批量匹配模式`
- `B：随意单测模式`

其核心特点是：

- 默认进入批量匹配模式
- 通过镜像页顶部模式条切换
- 模式切换即清空另一模式数据
- 批量匹配严格依据文件名首段进行配对
- 随意单测明确显示当前文件名并支持单侧清空

这样既满足实际批量比对工作流，也保留了快速自由试验的轻量导入方式。
