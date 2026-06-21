import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Role = 'student' | 'organizer' | 'instructor';
type Status = 'Clear Type' | 'Torn Type' | 'Stuck Type' | 'Paused Type';
type StatusBand = 'LOW' | 'MIDDLE' | 'HIGH';

type DatasetEntry = {
  id: string;
  role: Role;
  roleLabel: string;
  Y1: string;
  CE1: number;
  CE2: number;
  CE3: number;
  CE4: number;
  RE1: number;
  RE2: number;
  RE3: number;
  RE4: number;
  ceTotal: number;
  reTotal: number;
  ceMean: number;
  reMean: number;
  status: Status;
  statusBand: {
    ce: StatusBand;
    re: StatusBand;
  };
  nearCenterBand: boolean;
};

const Y1_OPTIONS = [
  '很像我真实的声音',
  '应该是我，但是音更低',
  '应该是我，但是音更高',
  '不太像我',
] as const;

function loadDataset(): DatasetEntry[] {
  const filePath = path.resolve(process.cwd(), 'prototypes/ce-re/dataset.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as DatasetEntry[];
}

function mean(total: number): number {
  return total / 4;
}

function classifyBand(value: number): StatusBand {
  if (value < 45) {
    return 'LOW';
  }
  if (value > 55) {
    return 'HIGH';
  }
  return 'MIDDLE';
}

function deriveStatus(entry: DatasetEntry): {
  status: Status;
  statusBand: { ce: StatusBand; re: StatusBand };
  nearCenterBand: boolean;
} {
  const statusBand = {
    ce: classifyBand(entry.ceMean),
    re: classifyBand(entry.reMean),
  };

  if (entry.ceMean >= 50 && entry.reMean < 50) {
    return {
      status: 'Clear Type',
      statusBand,
      nearCenterBand: statusBand.ce === 'MIDDLE' || statusBand.re === 'MIDDLE',
    };
  }
  if (entry.ceMean >= 50 && entry.reMean >= 50) {
    return {
      status: 'Torn Type',
      statusBand,
      nearCenterBand: statusBand.ce === 'MIDDLE' || statusBand.re === 'MIDDLE',
    };
  }
  if (entry.ceMean < 50 && entry.reMean >= 50) {
    return {
      status: 'Stuck Type',
      statusBand,
      nearCenterBand: statusBand.ce === 'MIDDLE' || statusBand.re === 'MIDDLE',
    };
  }
  return {
    status: 'Paused Type',
    statusBand,
    nearCenterBand: statusBand.ce === 'MIDDLE' || statusBand.re === 'MIDDLE',
  };
}

test('dataset keeps 20 CE/RE prototype entries with 8 raw item values and derived fields', () => {
  const dataset = loadDataset();

  assert.equal(dataset.length, 20);

  dataset.forEach((entry) => {
    assert.match(entry.id, /^ce-re-\d{2}$/);
    assert.ok(['student', 'organizer', 'instructor'].includes(entry.role));
    assert.ok(['学员', '组委', '讲师'].includes(entry.roleLabel));
    assert.ok(Y1_OPTIONS.includes(entry.Y1 as (typeof Y1_OPTIONS)[number]));
    assert.equal(typeof entry.CE1, 'number');
    assert.equal(typeof entry.CE2, 'number');
    assert.equal(typeof entry.CE3, 'number');
    assert.equal(typeof entry.CE4, 'number');
    assert.equal(typeof entry.RE1, 'number');
    assert.equal(typeof entry.RE2, 'number');
    assert.equal(typeof entry.RE3, 'number');
    assert.equal(typeof entry.RE4, 'number');
    assert.equal(typeof entry.ceTotal, 'number');
    assert.equal(typeof entry.reTotal, 'number');
    assert.equal(typeof entry.ceMean, 'number');
    assert.equal(typeof entry.reMean, 'number');
    assert.ok(['Clear Type', 'Torn Type', 'Stuck Type', 'Paused Type'].includes(entry.status));
    assert.equal(typeof entry.nearCenterBand, 'boolean');
  });
});

test('dataset stores one Y1 choice for every entry', () => {
  const dataset = loadDataset();

  dataset.forEach((entry) => {
    assert.equal(typeof entry.Y1, 'string');
    assert.equal(Y1_OPTIONS.includes(entry.Y1 as (typeof Y1_OPTIONS)[number]), true);
  });
});

test('dataset role distribution is 13 student, 3 organizer, 4 instructor', () => {
  const dataset = loadDataset();
  const roleCounts = dataset.reduce<Record<Role, number>>(
    (counts, entry) => {
      counts[entry.role] += 1;
      return counts;
    },
    { student: 0, organizer: 0, instructor: 0 },
  );

  assert.deepEqual(roleCounts, {
    student: 13,
    organizer: 3,
    instructor: 4,
  });
});

test('dataset status distribution uses only four main types', () => {
  const dataset = loadDataset();
  const statuses = new Set(dataset.map((entry) => entry.status));

  assert.deepEqual([...statuses].sort(), ['Clear Type', 'Paused Type', 'Stuck Type', 'Torn Type']);
});

test('dataset keeps nearCenterBand for entries touching the middle band', () => {
  const dataset = loadDataset();
  const flagged = dataset.filter((entry) => entry.nearCenterBand);

  assert.equal(flagged.length, 2);
  assert.deepEqual(
    flagged.map((entry) => entry.id),
    ['ce-re-19', 'ce-re-20'],
  );
});

test('dataset derived values stay in sync with calculateScores and deriveStatus', () => {
  const dataset = loadDataset();

  dataset.forEach((entry) => {
    const ceTotal = entry.CE1 + entry.CE2 + entry.CE3 + entry.CE4;
    const reTotal = entry.RE1 + entry.RE2 + entry.RE3 + entry.RE4;
    const ceMean = mean(ceTotal);
    const reMean = mean(reTotal);
    const derived = deriveStatus({
      ...entry,
      ceTotal,
      reTotal,
      ceMean,
      reMean,
    });

    assert.equal(entry.ceTotal, ceTotal);
    assert.equal(entry.reTotal, reTotal);
    assert.equal(entry.ceMean, ceMean);
    assert.equal(entry.reMean, reMean);
    assert.equal(entry.status, derived.status);
    assert.deepEqual(entry.statusBand, derived.statusBand);
    assert.equal(entry.nearCenterBand, derived.nearCenterBand);
  });
});

test('dataset values match the final page copy and options used by the standalone html files', () => {
  const dataset = loadDataset();
  const questionnaireHtml = readFileSync(path.resolve(process.cwd(), 'prototypes/ce-re/questionnaire.html'), 'utf8');
  const distributionHtml = readFileSync(path.resolve(process.cwd(), 'prototypes/ce-re/distribution.html'), 'utf8');

  const roleLabels = new Set(dataset.map((entry) => entry.roleLabel));
  const statuses = new Set(dataset.map((entry) => entry.status));
  const y1Options = new Set(dataset.map((entry) => entry.Y1));

  assert.deepEqual([...roleLabels].sort(), ['学员', '组委', '讲师']);
  assert.deepEqual([...statuses].sort(), [
    'Clear Type',
    'Paused Type',
    'Stuck Type',
    'Torn Type',
  ]);

  roleLabels.forEach((label) => {
    assert.match(distributionHtml, new RegExp(label));
  });
  statuses.forEach((status) => {
    assert.match(questionnaireHtml, new RegExp(status.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(distributionHtml, new RegExp(status.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  y1Options.forEach((option) => {
    assert.match(questionnaireHtml, new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(distributionHtml, new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
