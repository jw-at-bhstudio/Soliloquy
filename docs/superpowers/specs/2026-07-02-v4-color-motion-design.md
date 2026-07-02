# V4 Color Motion Design

## 背景

当前 `v1-gray-8` 已收敛为稳定基线工具，其核心价值是：

- 宽度方向作为时间轴
- 每一列对应一个时间帧
- `f0` 由列内亮度重心决定
- `H1..H8` 由列内 `8` 阶灰度占比决定

该工具具备良好的可解释性与可复现性，但已明确存在三类局限：

- 颜色信息被完全丢弃
- 横向变化较弱的图片容易得到过于平稳的时间起伏
- 当图片的主要差异来自颜色或横向结构时，结果区分度不足

因此需要新增一个与 `v1` 并列、而非替代 `v1` 的实验工具，用于验证：

- 颜色是否可以稳定地拉开不同图片的“音色差异”
- 横向变化率是否可以稳定地增加时间包络的“生命感”

## 目标

### 目标 1：工具并列，不污染基线

新增一个实验工具，暂定名为：

- `v4-color-motion`

其定位是 `v1` 的并列实验工具，而不是 `v1` 的增强开关或后续升级版。

### 目标 2：保留 `v1` 的可解释骨架

`v4` 必须保留以下基础约定：

- 图片宽度仍然对应时间轴
- 每一列仍然对应一个时间帧
- 输出 JSON 仍与当前 voiceprint 协议完全同构
- `v1` 的列统计映射仍然作为基础层存在

### 目标 3：颜色负责音色，横向变化率负责时间调制

`v4` 的增强职责拆分如下：

- 颜色特征主要作用于 `H1..H8` 的相对分配
- 横向变化率主要作用于逐帧 `activity / envelope`

第一版中：

- 颜色不直接替换灰度桶
- 横向变化率不直接主导 `f0`

### 目标 4：实验版允许参数调节

由于颜色和横向变化率的影响强度暂时无法通过纸面讨论完全确定，第一版必须暴露有限数量的调节参数，使后续可以基于使用反馈迭代。

## 非目标

- 本轮不修改现有 `v1-gray-8`
- 本轮不追求“更像真实声音”
- 本轮不把颜色映射成固定的“红对应某阶、蓝对应某阶”
- 本轮不让横向变化率直接生成伪音频波形
- 本轮不让 `motion` 在第一版中直接强扰动 `f0`
- 本轮不试图一次解决所有图片类型

## 工具定位

`v4-color-motion` 应被理解为：

- `v1` 提供发声骨架
- `color` 提供音色偏置
- `motion` 提供时间调制

更具体地说：

- `v1` 回答“这一列的基础声纹结构是什么”
- `color` 回答“这一列更偏向怎样的谐波性格”
- `motion` 回答“这一列在时间上是否应该比相邻列更活跃”

这意味着 `v4` 不是把图片横向变化直接视为声音，而是将图片中的视觉变化视为对声学骨架的调制来源。

## 输入与输出

### 输入

工具继续接受：

- 一张或多张图片
- `sampleCount`
- `imageHeight`
- `duration`

并新增一组实验参数，见“参数面板”章节。

### 输出

每张图片至少输出：

1. `voiceprint.json`
2. 中间预览图与调试数据

`voiceprint.json` 仍保持与现有协议同构，至少包括：

- `time`
- `f0`
- `tracks[1..8].amplitudes`
- `duration`
- `sampleCount`
- `referencePeak`
- `referenceRms`

## 总体数据流

`v4` 的处理链分为五层：

1. 图片重采样
2. 每列基础特征提取
3. `v1` 基础声纹生成
4. 颜色修饰层生成
5. 横向变化率调制层生成

最终公式为：

```text
harmonicShapeFinal[t, k] =
  normalize(harmonicShapeBase[t, k] * colorModifier[t, k])

activityFinal[t] =
  clamp(activityBase[t] * motionModifier[t], 0, 1)

A_final[t, k] =
  activityFinal[t] * harmonicShapeFinal[t, k]
```

其中：

- `harmonicShapeBase` 来自 `v1` 的灰度桶基底
- `colorModifier` 来自颜色特征
- `activityBase` 来自 `v1` 的列活跃度
- `motionModifier` 来自横向变化率

## 基础列特征

在 `v1` 已有灰度特征基础上，`v4` 需要为每一列补充以下颜色特征：

- `satMean`：该列像素平均饱和度
- `hueCenter`：该列主导色相
- `hueVar`：该列色相离散度

同时需要补充用于横向变化率计算的差分特征：

- `grayBucketDiff`
- `centroidDiff`
- `contrastDiff`

这些差分值不是直接从原始列上硬算，而是先对特征序列做小窗口平滑，再进行列间差分，以避免单列噪点造成误判。

## 基础层：沿用 V1 骨架

`v4` 的基础层与 `v1` 保持一致：

- `f0Base[t]` 由 `centroidY` 的对数映射得到
- `harmonicShapeBase[t, k]` 由 `grayBuckets[t, k]` 得到
- `activityBase[t] = 0.7 * colEnergy + 0.3 * colContrast`

当 `activityBase[t]` 低于静音阈值时：

- `f0[t] = 0`
- `A[t, 1..8] = 0`

此规则在 `v4` 中保持不变。

## 颜色修饰层

### 原则

颜色不能直接取代灰度结构，只能作为受限修饰层参与谐波分配。

颜色修饰层必须满足：

- 有颜色时可以改变谐波倾向
- 无明显颜色时应自然退回接近 `v1`
- 不允许因颜色导致低阶谐波被完全掏空

### 颜色作用维度

颜色特征的职责拆分如下：

- `satMean`：决定高阶谐波倾向的强弱
- `hueCenter`：决定谐波能量中心偏向哪一段区间
- `hueVar`：决定谐波分布是集中还是分散

### 颜色修饰公式

定义：

```text
harmonicShapeBase[k] = grayBuckets[k]

satTilt[k] = lerp(lowHarmonicBias[k], highHarmonicBias[k], satMean)
hueCenterWindow[k] = hueCenteredWindow(k, hueCenter)
hueSpreadWindow[k] = spreadControl(k, hueVar)

colorModifierRaw[k] =
  satTilt[k] *
  hueCenterWindow[k] *
  hueSpreadWindow[k]

colorModifier[k] =
  blend(1, colorModifierRaw[k], colorInfluence)

harmonicShapeColorized[k] =
  normalize(harmonicShapeBase[k] * colorModifier[k])
```

其中：

- `blend(1, x, colorInfluence)` 表示颜色修饰从“完全不影响”到“中度影响”的连续过渡
- `normalize()` 确保最终 `H1..H8` 仍为归一化分布

### 防过花约束

为防止颜色修饰过度花哨，第一版必须实现以下保护栏：

1. `colorInfluence` 有上限，不允许颜色完全压过灰度结构
2. `H1/H2` 必须存在保底权重 `lowHarmonicFloor`
3. 当 `satMean < desaturateFallback` 时，颜色修饰自动衰减至接近 `1`
4. 对 `colorModifierRaw` 进行幅度裁剪，避免单轨被异常放大

## 横向变化率调制层

### 原则

横向变化率的角色不是“直接生成声音”，而是调制逐帧活跃度与包络。

第一版中：

- `motion` 只作用于 `activity`
- 不直接主导 `f0`
- 不直接重写 `H1..H8`

### 变化率来源

对于第 `t` 列，定义：

```text
motionRaw[t] =
  0.5 * grayBucketDiff[t] +
  0.3 * centroidDiff[t] +
  0.2 * contrastDiff[t]
```

其中所有差分特征都在小窗口平滑后计算。

### 变化率修饰公式

```text
motionFiltered[t] =
  compress(max(0, motionRaw[t] - motionThreshold), motionCompression)

motionModifier[t] =
  1 + motionInfluence * motionFiltered[t]

activityFinal[t] =
  clamp(activityBase[t] * motionModifier[t], 0, 1)
```

### 防噪声约束

为防止画面边缘与压缩噪点被当作强运动，第一版必须实现以下保护栏：

1. 先平滑再求差
2. 小于 `motionThreshold` 的变化率直接忽略
3. 大变化做软压缩，不允许线性无限放大
4. `motionInfluence` 设定上限，不允许单列异常尖峰把整段包络拉爆

## F0 规则

第一版中：

- `f0Final = f0Base`

也就是说，`motion` 不进入 `f0`。

原因是：

- 颜色已经负责音色差异
- `motion` 已经负责时间调制
- 若第一版再让 `motion` 扰动 `f0`，很容易产生“视觉边缘很多，音高乱跳”的失真效果

如果后续实验反馈表明结果仍然过平，再考虑增加一个极轻量的 `f0Jitter` 可选项，但不在本次范围内。

## 参数面板

第一版只暴露少量核心参数，避免实验工具一开始就过度复杂。

### 基础参数

- `sampleCount`
- `imageHeight`
- `duration`

### 颜色参数

- `colorInfluence`：颜色对谐波分配的总影响强度
- `colorHighHarmonicBias`：高饱和度时向高阶谐波倾斜的力度
- `colorHueSpread`：色相离散度对谐波分散程度的影响
- `lowHarmonicFloor`：低阶谐波保底值
- `desaturateFallback`：低饱和度回退阈值

### Motion 参数

- `motionInfluence`：横向变化率对包络的总影响强度
- `motionThreshold`：小变化忽略阈值
- `motionSmoothingWindow`：求差前平滑窗口大小
- `motionCompression`：大变化软压缩强度

### 默认策略

默认值应遵循“保守中值”原则：

- 颜色修饰默认开启，但强度中等偏低
- `motion` 修饰默认开启，但只修饰包络
- 默认结果必须明显区别于 `v1`，但不能显著跑向 `v2/v3` 式的过度结构化或过度风格化

## 页面与预览

`v4-color-motion` 页面应至少提供四类可见输出：

1. 图片输入与参数区域
2. 中间预览区域
3. JSON 文本预览区域
4. 下载区域

### 必需预览 1：灰度基础预览

继续保留：

- `8` 阶灰度预览图

用于确认 `v1` 基础层仍然存在。

### 必需预览 2：颜色音色预览

新增一个每列或当前选中列的 `H1..H8` 权重可视化，用于展示：

- 基础灰度分配
- 颜色修饰后的分配

该预览的目的不是美观，而是帮助判断“颜色是否过度影响谐波结构”。

### 必需预览 3：Motion 曲线预览

新增一条横向变化率曲线，用于展示：

- 原始变化率
- 阈值与压缩后的有效变化率

该预览用于帮助识别：

- 是否把图像边缘错误识别为强运动
- 是否把大片稳定区域正确保留为低运动状态

### 必需预览 4：最终 JSON

继续保留最终 JSON 文本与下载按钮，作为对 `Analyzer / Mirror` 同构输出的直接检查。

## 批量处理

如果直接复用现有 `v1` 批量处理页面能力，则：

- 批量上限继续保持 `10`
- 继续采用受控并发
- 每个条目独立显示其预览与下载项

本轮重点不是批量机制本身，而是单张映射逻辑的实验有效性，因此批量逻辑可尽量复用现有 `v1` 页面基础设施。

## 验证标准

### 结构验证

- 输出 JSON 与现有协议完全同构
- `tracks.length === 8`
- `time / f0 / amplitudes` 长度一致
- `f0 = 0` 时对应帧所有谐波振幅必须为 `0`

### 视觉验证

对于同一张图，`v4` 相比 `v1` 应满足：

1. 彩色图片的轨道分配差异更明显
2. 横向结构明显的图片，包络起伏更活
3. 低饱和度图片与横向稳定区域不会出现明显异常放大

### 风险验证

重点检查以下失败模式：

- 颜色修饰过强，导致轨道分布过花
- 横向变化率过强，导致边缘与噪点被误识别成强运动
- 结果与 `v1` 差异过小，实验信息量不足
- 结果与 `v2/v3` 一样过度风格化，解释链变长

## 风险与边界

### 风险 1：颜色特征并不天然等于“音色”

本设计不是在声学上声称“某种颜色客观对应某种谐波”，而是在建立一种稳定、可复现、可调节的跨模态映射。

### 风险 2：横向变化率更像调制器，而非声源

因此它只能在第一版中承担包络调制角色，不能直接取代 `f0` 或真实振动机制。

### 风险 3：实验工具的最佳参数可能因图片类型而变

这是参数面板存在的原因。第一版不追求“一组参数打天下”，而是追求：

- 默认值合理
- 参数少而有效
- 可基于反馈快速迭代

## 结论

`v4-color-motion` 的第一版设计是一种保守但清晰的实验方案：

- 保留 `v1` 作为稳定骨架
- 让颜色只修饰谐波分配
- 让横向变化率只调制时间包络
- 通过少量参数和调试预览，把不确定性暴露为可观察、可反馈、可迭代的实验变量

该设计的价值不在于一次到位，而在于为后续判断“颜色是否真的增加了音色区分度”“motion 是否真的增强了时间生命感”提供一套稳定的实验基线。
