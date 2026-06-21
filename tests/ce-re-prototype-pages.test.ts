import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('questionnaire page separates answer area and collapsed result area', () => {
  const filePath = path.resolve(process.cwd(), 'prototypes/ce-re/questionnaire.html');
  const html = readFileSync(filePath, 'utf8');

  assert.match(html, /<form id="questionnaire-form"/);
  assert.match(html, /<details[^>]*id="result-panel"/);
  assert.match(html, /<summary[^>]*>查看结果<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*id="result-panel"[^>]*\sopen[>\s]/);
  assert.match(html, /<style>/);
  assert.match(html, /<script>/);
  assert.match(html, /Download JSON/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);
  assert.doesNotMatch(html, /shared\//);
  assert.doesNotMatch(html, /data\//);
  assert.doesNotMatch(html, /Constructive Exploration/);
  assert.doesNotMatch(html, /Ruminative Exploration/);
  assert.doesNotMatch(html, /Dimension/);
});

test('questionnaire page keeps the final local output contract in one standalone file', () => {
  const filePath = path.resolve(process.cwd(), 'prototypes/ce-re/questionnaire.html');
  const html = readFileSync(filePath, 'utf8');

  assert.match(html, /Prototype \/ CE RE/);
  assert.match(html, /Questionnaire/);
  assert.match(html, /8 题作答/);
  assert.match(html, /4 主类型/);
  assert.match(html, /接近中间带/);
  assert.match(html, /createdAt/);
  assert.match(html, /responses/);
  assert.match(html, /nearCenterBand/);
  assert.match(html, /statusBand/);
  assert.match(html, /items/);
  assert.match(html, /Y1/);
  assert.match(html, /很像我真实的声音/);
  assert.match(html, /应该是我，但是音更低/);
  assert.match(html, /应该是我，但是音更高/);
  assert.match(html, /不太像我/);
  assert.match(html, /function buildQuestionnaireResult/);
});

test('prototype pages expose only four main status labels and near-center copy', () => {
  const questionnaireHtml = readFileSync(path.resolve(process.cwd(), 'prototypes/ce-re/questionnaire.html'), 'utf8');
  const distributionHtml = readFileSync(path.resolve(process.cwd(), 'prototypes/ce-re/distribution.html'), 'utf8');

  assert.match(questionnaireHtml, /接近中间带/);
  assert.match(distributionHtml, /接近中间带/);
  assert.doesNotMatch(questionnaireHtml, /Undecided Type/);
  assert.doesNotMatch(distributionHtml, /Undecided Type/);
});

test('distribution page is a standalone file:// prototype with local dataset input', () => {
  const filePath = path.resolve(process.cwd(), 'prototypes/ce-re/distribution.html');
  const html = readFileSync(filePath, 'utf8');

  assert.match(html, /<input[^>]+type="file"/);
  assert.match(html, /dataset\.json/);
  assert.match(html, /Role Distribution/);
  assert.match(html, /Status Distribution/);
  assert.match(html, /Y1 Distribution/);
  assert.match(html, /Individuals/);
  assert.match(html, /<style>/);
  assert.match(html, /<script>/);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);
  assert.doesNotMatch(html, /shared\//);
  assert.doesNotMatch(html, /data\//);
});

test('distribution page keeps all summary sections in the final standalone file', () => {
  const filePath = path.resolve(process.cwd(), 'prototypes/ce-re/distribution.html');
  const html = readFileSync(filePath, 'utf8');

  assert.match(html, /Prototype \/ CE RE/);
  assert.match(html, /直接通过 file:\/\/ 打开页面/);
  assert.match(html, /function summarizeDataset/);
  assert.match(html, /totalCount/);
  assert.match(html, /roleDistribution/);
  assert.match(html, /statusDistribution/);
  assert.match(html, /y1Distribution/);
  assert.match(html, /entries/);
});
