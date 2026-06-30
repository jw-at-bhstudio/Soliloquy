import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cssUrl = new URL('../src/index.css', import.meta.url);
const appShellUrl = new URL('../src/app/AppShell.tsx', import.meta.url);
const analyzerWorkspaceUrl = new URL('../src/features/analyzer/AnalyzerWorkspace.tsx', import.meta.url);
const analyzerJobListUrl = new URL(
  '../src/features/analyzer/components/AnalyzerJobList.tsx',
  import.meta.url,
);
const analyzerDetailHeaderUrl = new URL(
  '../src/features/analyzer/components/AnalyzerDetailHeader.tsx',
  import.meta.url,
);
const audioUploaderUrl = new URL('../src/features/analyzer/components/AudioUploader.tsx', import.meta.url);
const recorderUrl = new URL('../src/features/analyzer/components/Recorder.tsx', import.meta.url);
const trackListUrl = new URL('../src/features/analyzer/components/TrackList.tsx', import.meta.url);
const acousticCanvasUrl = new URL(
  '../src/features/analyzer/components/AcousticCanvas.tsx',
  import.meta.url,
);
const mirrorWorkspaceUrl = new URL('../src/features/mirror/MirrorWorkspace.tsx', import.meta.url);
const mirrorFloatingControlsUrl = new URL(
  '../src/features/mirror/components/FloatingControls.tsx',
  import.meta.url,
);
const mirrorVoiceprintCanvasUrl = new URL(
  '../src/features/mirror/components/VoiceprintCanvas.tsx',
  import.meta.url,
);

test('index.css imports brand + sans + mono fonts from Google Fonts', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /fonts\.googleapis\.com\/css2\?/);
  assert.match(css, /family=Chelsea\+Market(?:&|$)/);
  assert.match(css, /family=Noto\+Sans\+SC:wght@400(?:&|$)/);
  assert.match(css, /family=IBM\+Plex\+Mono:wght@400(?:&|$)/);
});

test('index.css defines theme tokens for fonts and typography', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /@theme\s*\{[\s\S]*?--font-brand:/);
  assert.match(css, /@theme\s*\{[\s\S]*?--font-sans:/);
  assert.match(css, /@theme\s*\{[\s\S]*?--font-mono:/);
  assert.match(css, /@theme\s*\{[\s\S]*?--text-title:/);
  assert.match(css, /@theme\s*\{[\s\S]*?--text-ui:/);
});

test('body uses sans font at weight 400 for default UI text', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /body\s*\{[\s\S]*?font-family:\s*var\(--font-sans\)\s*;/);
  assert.match(css, /body\s*\{[\s\S]*?font-weight:\s*400\s*;/);
});

test('app shell uses Soliloquy brand copy and pure Chinese navigation labels', async () => {
  const appShell = await readFile(appShellUrl, 'utf8');

  assert.match(appShell, /Soliloquy/);
  assert.match(appShell, /独白/);
  assert.match(appShell, /A Key Visual Generator for Self-Dialogue/);
  assert.match(appShell, /为唯理书院 2026 而作/);
  assert.match(appShell, /\n\s*分析\s*\n/);
  assert.match(appShell, /\n\s*镜像\s*\n/);
  assert.doesNotMatch(appShell, /\bAudioLines\b|\bSparkles\b/);
  assert.doesNotMatch(appShell, /\bbackdrop-blur\b/);
  assert.doesNotMatch(appShell, /Veritas Unified|A-B 深链接联动|分析工作台|镜像工作台/);
  assert.doesNotMatch(appShell, /font-bold|font-semibold|font-medium/);
});

test('analyzer uses branded copy and typography constraints', async () => {
  const [
    analyzerWorkspace,
    analyzerJobList,
    analyzerDetailHeader,
    audioUploader,
    recorder,
    trackList,
    acousticCanvas,
  ] = await Promise.all([
    readFile(analyzerWorkspaceUrl, 'utf8'),
    readFile(analyzerJobListUrl, 'utf8'),
    readFile(analyzerDetailHeaderUrl, 'utf8'),
    readFile(audioUploaderUrl, 'utf8'),
    readFile(recorderUrl, 'utf8'),
    readFile(trackListUrl, 'utf8'),
    readFile(acousticCanvasUrl, 'utf8'),
  ]);

  assert.match(analyzerWorkspace, />\s*分析\s*</);
  assert.match(analyzerWorkspace, /导入声音，生成可继续试听与导出的结果。/);

  assert.match(analyzerWorkspace, />\s*输入\s*</);
  assert.match(analyzerWorkspace, />\s*参数\s*</);
  assert.match(analyzerWorkspace, />\s*波形\s*</);
  assert.match(analyzerWorkspace, />\s*原理\s*</);
  assert.match(analyzerWorkspace, />\s*摘要\s*</);

  assert.match(analyzerJobList, />\s*任务列表\s*</);
  assert.match(trackList, />\s*当前结果\s*</);

  assert.match(analyzerDetailHeader, />\s*导出 JSON\s*</);
  assert.match(analyzerDetailHeader, />\s*在镜像中打开\s*</);

  const analyzerBundle = [
    analyzerWorkspace,
    analyzerJobList,
    analyzerDetailHeader,
    audioUploader,
    recorder,
    trackList,
    acousticCanvas,
  ].join('\n');

  assert.doesNotMatch(analyzerBundle, /font-bold|font-semibold|font-medium/);
  assert.doesNotMatch(analyzerBundle, /\btext-(xs|sm|base|lg|xl|\[[0-9])/);
  assert.doesNotMatch(analyzerBundle, /className="[^"]*\bfont-mono\b[^"]*"/);
  assert.doesNotMatch(analyzerBundle, /className=\{\s*`[^`]*\bfont-mono\b[^`]*`\s*\}/);
  assert.doesNotMatch(analyzerBundle, /className=\{\s*['"][^'"]*\bfont-mono\b[^'"]*['"]\s*\}/);
  assert.doesNotMatch(
    analyzerBundle,
    /THE ANALYZER|MICROPHONE INSTANCE|SYNTHESIS|ROUTING|RECORDING\.\.\.|ORIGINAL|RECONSTRUCT|BATCH F0|Illustrator|Figma/,
  );
});

test('mirror uses branded copy and typography constraints', async () => {
  const [mirrorWorkspace, mirrorFloatingControls, mirrorVoiceprintCanvas] = await Promise.all([
    readFile(mirrorWorkspaceUrl, 'utf8'),
    readFile(mirrorFloatingControlsUrl, 'utf8'),
    readFile(mirrorVoiceprintCanvasUrl, 'utf8'),
  ]);

  assert.match(mirrorWorkspace, />\s*镜像\s*</);
  assert.match(mirrorWorkspace, /调整单条结果的形态、试听与输出。/);
  assert.match(mirrorWorkspace, />\s*返回分析\s*</);
  assert.match(mirrorWorkspace, />\s*说明\s*</);

  assert.match(mirrorFloatingControls, />\s*镜像参数\s*</);
  assert.match(mirrorFloatingControls, /voiceprintSectionTitle:\s*"声纹输入"/);
  assert.match(mirrorFloatingControls, />\s*轨道\s*</);
  assert.match(mirrorFloatingControls, />\s*形变\s*</);
  assert.match(mirrorFloatingControls, />\s*绘制\s*</);
  assert.match(mirrorFloatingControls, />\s*导出\s*</);
  assert.match(mirrorFloatingControls, /开始试听/);
  assert.match(mirrorFloatingControls, /停止试听/);
  assert.match(mirrorFloatingControls, /导入[\s\S]*JSON/);
  assert.match(mirrorFloatingControls, /复制[\s\S]*SVG/);

  const mirrorBundle = [mirrorWorkspace, mirrorFloatingControls, mirrorVoiceprintCanvas].join('\n');
  assert.match(mirrorBundle, /var\(--text-title\)/);
  assert.match(mirrorBundle, /var\(--text-ui\)/);
  assert.match(mirrorBundle, /var\(--font-mono\)/);
  assert.doesNotMatch(mirrorBundle, /font-bold|font-semibold|font-medium/);
  assert.doesNotMatch(mirrorBundle, /\btext-(xs|sm|base|lg|xl|\[[0-9])/);
  assert.doesNotMatch(mirrorBundle, /className="[^"]*\bfont-mono\b[^"]*"/);
  assert.doesNotMatch(mirrorBundle, /className=\{\s*`[^`]*\bfont-mono\b[^`]*`\s*\}/);
  assert.doesNotMatch(mirrorBundle, /className=\{\s*['"][^'"]*\bfont-mono\b[^'"]*['"]\s*\}/);
  assert.doesNotMatch(
    mirrorBundle,
    /SPECULAR RUMINATION|镜面反刍|ENGINE V1\.3|DATA PIPELINE|TEMPORAL DEFORMATION CORES|ORBIT & DEPICT SPECS|COORDINATE:|SOURCE:/,
  );
});

async function collectFilesRecursively(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await collectFilesRecursively(fullPath)));
        return;
      }

      if (entry.isFile()) {
        const fileStat = await stat(fullPath);
        if (fileStat.isFile()) files.push(fullPath);
      }
    }),
  );

  return files;
}

test('src has no forbidden typography utility classes', async () => {
  const srcRootDir = fileURLToPath(new URL('../src', import.meta.url));
  const allFiles = await collectFilesRecursively(srcRootDir);
  const targetFiles = allFiles.filter((filePath) => /\.(ts|tsx|css)$/.test(filePath));

  const forbiddenFontWeight = /\bfont-(bold|semibold|medium)\b/;
  const forbiddenTextSize = /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/;
  const forbiddenTextArbitrary = /\btext-\[[^\]]+\]\b/;
  const forbiddenClassNameFontMono = [
    /className="[^"]*\bfont-mono\b[^"]*"/,
    /className=\{\s*`[^`]*\bfont-mono\b[^`]*`\s*\}/,
    /className=\{\s*['"][^'"]*\bfont-mono\b[^'"]*['"]\s*\}/,
  ];

  const violations: string[] = [];
  await Promise.all(
    targetFiles.map(async (filePath) => {
      const contents = await readFile(filePath, 'utf8');

      if (forbiddenFontWeight.test(contents)) {
        violations.push(`${path.relative(srcRootDir, filePath)}: font-(bold|semibold|medium)`);
      }

      if (forbiddenTextSize.test(contents)) {
        violations.push(
          `${path.relative(srcRootDir, filePath)}: text-(xs|sm|base|lg|xl|2xl|3xl|4xl)`,
        );
      }

      if (forbiddenTextArbitrary.test(contents)) {
        violations.push(`${path.relative(srcRootDir, filePath)}: text-[...]`);
      }

      if (/\.(ts|tsx)$/.test(filePath)) {
        for (const pattern of forbiddenClassNameFontMono) {
          if (pattern.test(contents)) {
            violations.push(`${path.relative(srcRootDir, filePath)}: className contains font-mono`);
            break;
          }
        }
      }
    }),
  );

  assert.equal(
    violations.length,
    0,
    `Found forbidden typography utility usage:\n${violations.map((line) => `- ${line}`).join('\n')}`,
  );
});
