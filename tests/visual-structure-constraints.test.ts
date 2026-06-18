import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as layout from '../src/shared/ui/layout';

test('layout exports Task 1 visual structure helpers', () => {
  assert.equal(typeof layout.getPageContainerClassName, 'function');
  assert.equal(typeof layout.getPageHeaderClassName, 'function');
  assert.equal(typeof layout.getStatusStripClassName, 'function');
  assert.equal(typeof layout.getPanelClassName, 'function');
});

test('layout keeps page headers compact and status strips inline', () => {
  assert.doesNotMatch(layout.getPageHeaderClassName(), /border-b|pb-4/);
  assert.match(layout.getPageHeaderClassName(), /gap-2/);
  assert.match(layout.getStatusStripClassName(), /inline-flex/);
  assert.doesNotMatch(layout.getStatusStripClassName(), /(^|\s)w-full(\s|$)/);
});

function assertWorkspaceUsesUnifiedPageContainer(source: string, workspaceName: string) {
  assert.match(source, /getPageContainerClassName/, `expected ${workspaceName} to use getPageContainerClassName`);
  assert.match(
    source,
    /<div className=\{getPageContainerClassName\(\)\}>[\s\S]*?<header className=\{getPageHeaderClassName\(\)\}>[\s\S]*?<div className=\{getStatusStripClassName\(\)\}>[\s\S]*?<main className=/,
    `expected ${workspaceName} to keep header, status strip, and main inside one shared page container`,
  );

  const pageContainerIndex = source.indexOf('getPageContainerClassName()');
  const headerIndex = source.indexOf('<header className={getPageHeaderClassName()}>');
  const statusIndex = source.indexOf('<div className={getStatusStripClassName()}>');
  const mainIndex = source.indexOf('<main className=');
  assert.ok(pageContainerIndex >= 0 && headerIndex > pageContainerIndex);
  assert.ok(statusIndex > headerIndex);
  assert.ok(mainIndex > statusIndex);

  assert.doesNotMatch(source, /<header className=\{`[^`]*px-6[^`]*`\}/);
  assert.doesNotMatch(source, /<div className="shrink-0 px-6 pb-4">/);
  assert.doesNotMatch(source, /<main className="[^"]*max-w-\[1600px\][^"]*p-4[^"]*"/);
}

test('AnalyzerWorkspace uses shared lightweight header and dedicated status strip structure', () => {
  const workspacePath = path.resolve(
    process.cwd(),
    'src/features/analyzer/AnalyzerWorkspace.tsx',
  );
  const source = readFileSync(workspacePath, 'utf8');

  assert.match(source, /getPageHeaderClassName/);
  assert.match(source, /getStatusStripClassName/);

  const headerMatch = source.match(/<header[\s\S]*?<\/header>/);
  assert.ok(headerMatch, 'expected AnalyzerWorkspace to render a header block');

  const headerSource = headerMatch[0];
  assert.doesNotMatch(headerSource, /<Activity\b/);
  assert.doesNotMatch(headerSource, /<AudioLines\b/);
  assert.doesNotMatch(headerSource, /summary\.(total|queued|processing|ready)/);
  assert.doesNotMatch(headerSource, /max-w-\[560px\]/);

  const statusStripMatch = source.match(
    /<div className=\{\s*getStatusStripClassName\(\)\s*\}>[\s\S]*?<\/div>/,
  );
  assert.ok(statusStripMatch, 'expected AnalyzerWorkspace to render a dedicated status strip');

  const statusStripSource = statusStripMatch[0];
  assert.match(statusStripSource, /summary\.total/);
  assert.match(statusStripSource, /summary\.queued/);
  assert.match(statusStripSource, /summary\.processing/);
  assert.match(statusStripSource, /summary\.ready/);

  const waveformPanelHeadingMatch = source.match(
    /<div className="flex items-center gap-1\.5">[\s\S]*?<span className="text-white">波形<\/span>[\s\S]*?<\/div>/,
  );
  assert.ok(
    waveformPanelHeadingMatch,
    'expected AnalyzerWorkspace to render a waveform panel heading',
  );
  assert.doesNotMatch(waveformPanelHeadingMatch[0], /<AudioLines\b/);

  const explanationHeadingMatch = source.match(
    /<div className="text-white\/60">原理<\/div>/,
  );
  assert.ok(
    explanationHeadingMatch,
    'expected AnalyzerWorkspace to render an explanation panel heading',
  );
  assert.doesNotMatch(explanationHeadingMatch[0], /<HelpCircle\b/);
});

test('MirrorWorkspace uses shared lightweight header and status strip for mirror metadata', () => {
  const workspacePath = path.resolve(
    process.cwd(),
    'src/features/mirror/MirrorWorkspace.tsx',
  );
  const source = readFileSync(workspacePath, 'utf8');

  assert.match(source, /getPageHeaderClassName/);
  assert.match(source, /getStatusStripClassName/);

  const headerMatch = source.match(/<header[\s\S]*?<\/header>/);
  assert.ok(headerMatch, 'expected MirrorWorkspace to render a header block');

  const headerSource = headerMatch[0];
  assert.doesNotMatch(headerSource, /来源：/);
  assert.doesNotMatch(headerSource, /<Sparkles\b/);
  assert.doesNotMatch(headerSource, /<HelpCircle\b/);
  assert.doesNotMatch(headerSource, /voiceprint\.duration/);
  assert.doesNotMatch(headerSource, /voiceprint\.sampleCount/);
  assert.doesNotMatch(headerSource, /sessionTitle/);

  const statusStripMatch = source.match(
    /<div className=\{\s*getStatusStripClassName\(\)\s*\}>[\s\S]*?<\/div>/,
  );
  assert.ok(statusStripMatch, 'expected MirrorWorkspace to render a dedicated status strip');

  const statusStripSource = statusStripMatch[0];
  assert.match(statusStripSource, /sourceLabel/);
  assert.match(statusStripSource, /voiceprint\.duration/);
  assert.match(statusStripSource, /voiceprint\.sampleCount/);

  assert.match(
    source,
    /<main className="[^"]*overflow-y-auto[^"]*lg:overflow-hidden/,
    'expected MirrorWorkspace main area to scroll vertically on small viewports and preserve drawing height on large viewports',
  );

  const explanationTitleMatch = source.match(
    /<div className="flex items-center gap-1\.5 text-white">[\s\S]*?镜像说明[\s\S]*?<\/div>/,
  );
  assert.ok(explanationTitleMatch, 'expected MirrorWorkspace to render an explanation modal title');
  assert.doesNotMatch(explanationTitleMatch[0], /<Sparkles\b/);
});

test('AnalyzerWorkspace keeps header, status strip, and main content on one shared page container baseline', () => {
  const workspacePath = path.resolve(process.cwd(), 'src/features/analyzer/AnalyzerWorkspace.tsx');
  const source = readFileSync(workspacePath, 'utf8');

  assertWorkspaceUsesUnifiedPageContainer(source, 'AnalyzerWorkspace');
});

test('MirrorWorkspace keeps header, status strip, and main content on one shared page container baseline', () => {
  const workspacePath = path.resolve(process.cwd(), 'src/features/mirror/MirrorWorkspace.tsx');
  const source = readFileSync(workspacePath, 'utf8');

  assertWorkspaceUsesUnifiedPageContainer(source, 'MirrorWorkspace');
});

test('workspace panels avoid decorative tracking utilities and inconsistent leading helpers', () => {
  const files = [
    'src/features/analyzer/AnalyzerWorkspace.tsx',
    'src/features/mirror/MirrorWorkspace.tsx',
    'src/features/mirror/components/FloatingControls.tsx',
    'src/features/analyzer/components/AnalyzerDetailHeader.tsx',
    'src/features/analyzer/components/AnalyzerJobList.tsx',
    'src/features/analyzer/components/TrackList.tsx',
    'src/features/analyzer/components/AudioUploader.tsx',
    'src/features/analyzer/components/Recorder.tsx',
  ];

  const bundle = files
    .map((filePath) => readFileSync(path.resolve(process.cwd(), filePath), 'utf8'))
    .join('\n');

  assert.doesNotMatch(bundle, /tracking-wider|tracking-wide|tracking-widest/);
  assert.doesNotMatch(bundle, /leading-none/);
});

test('AppShell navigation stays text-first without decorative nav icons', () => {
  const shellPath = path.resolve(process.cwd(), 'src/app/AppShell.tsx');
  const source = readFileSync(shellPath, 'utf8');

  const navMatch = source.match(/<nav[\s\S]*?<\/nav>/);
  assert.ok(navMatch, 'expected AppShell to render a top navigation block');

  const navSource = navMatch[0];
  assert.doesNotMatch(navSource, /<AudioLines\b/);
  assert.doesNotMatch(navSource, /<Sparkles\b/);
});

test('FloatingControls keeps mirror actions while separating secondary control groups', () => {
  const controlsPath = path.resolve(
    process.cwd(),
    'src/features/mirror/components/FloatingControls.tsx',
  );
  const source = readFileSync(controlsPath, 'utf8');

  assert.match(source, />\s*镜像参数\s*</);
  assert.match(source, /开始试听|停止试听/);
  assert.match(source, /复制[\s\S]*SVG/);

  assert.match(source, /id="control-group-import"/);
  assert.match(source, /id="control-group-mirror-params"/);
  assert.match(source, /id="control-group-actions"/);
  assert.match(source, />\s*导入与示例\s*</);
  assert.match(source, />\s*镜像参数\s*</);
  assert.match(source, />\s*试听与导出\s*</);
  assert.match(source, /lg:h-full/);
  assert.doesNotMatch(source, /max-h-\[38dvh\]/);
});
