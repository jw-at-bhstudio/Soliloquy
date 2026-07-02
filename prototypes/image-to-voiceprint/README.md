# Image To Voiceprint Prototypes

三个工具都把单张图片映射为与现有 voiceprint 结构同构的 JSON，便于后续导入镜像模块做可视化对照。

## Tools

- `v1-gray-8`: 灰度量化 baseline，适合快速试验和高层观察。
- `v2-column-scan`: 列扫描主方案，按垂直分带能量生成 8 轨谐波幅度。
- `v3-global-hybrid`: 在 V2 基础上叠加全局亮度、对比度和包络修饰，适合风格化结果。

## Usage

1. 在仓库根目录运行 `npm run dev`。
2. 打开 `/prototypes/image-to-voiceprint/` 首页。
3. 进入任一工具页。
4. 上传一张图片，点击“生成 JSON”。
5. 下载导出的 `*.voiceprint.json` 文件。
6. 将导出的 JSON 导入现有镜像模块，对照可视化结果。

## Routes

- `/prototypes/image-to-voiceprint/`
- `/prototypes/image-to-voiceprint/v1-gray-8/`
- `/prototypes/image-to-voiceprint/v2-column-scan/`
- `/prototypes/image-to-voiceprint/v3-global-hybrid/`

## Output Shape

导出的 JSON 统一包含以下核心字段：

- `time`
- `f0`
- `tracks`
- `duration`
- `sampleCount`
- `referenceRms`
- `referencePeak`

其中 `tracks` 固定为 8 条谐波轨道，每条轨道包含：

- `harmonicOrder`
- `amplitudes`
- `averageEnergy`

## Manual Check

1. 在 V1 上传高对比图片，确认可下载 `.v1.voiceprint.json`。
2. 在 V2 上传同一图片，确认可下载 `.v2.voiceprint.json`。
3. 在 V3 上传同一图片，确认可下载 `.v3.voiceprint.json`。
4. 三份 JSON 都能被现有镜像模块导入。
5. 三份 JSON 的图形差异可见，且都满足共享 schema 校验。

## Notes

- 原型实现保持隔离在 `prototypes/image-to-voiceprint/`。
- 不修改 `src` 主线业务文件。
- 图片解码依赖浏览器 Canvas API，默认把图片重采样为 `467 x 256` 再提取列特征。
