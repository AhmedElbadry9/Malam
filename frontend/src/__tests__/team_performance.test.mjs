import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseDateInput,
  resolvePeriod,
  isDateInRange,
  getStageCompletionDate,
  computeMemberPerformance,
  summarizePerformance,
  selectPerformanceMembers,
} from '../utils/teamPerformance.ts';

// Fixed "today" so every test is deterministic: Wednesday 28 Oct 2026, 14:00 local.
const NOW = new Date(2026, 9, 28, 14, 0, 0);

const member = (id, role_type = 'employee') => ({
  id,
  username: `u${id}`,
  name: `Member ${id}`,
  role: 'role',
  email: `u${id}@x.com`,
  role_type,
  is_active: true,
});

const stage = (id, assigned_member_id, status, extra = {}) => ({
  id,
  client_id: 1,
  department_id: 1,
  assigned_member_id,
  stage_name: `Stage ${id}`,
  status,
  order_index: id,
  ...extra,
});

const client = (stages) => ({
  id: 1,
  name: 'Client',
  company_name: 'Company',
  stages,
});

describe('Team performance: date helpers', () => {
  it('parses <input type="date"> values as LOCAL dates', () => {
    const d = parseDateInput('2026-10-05');
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 9);
    assert.strictEqual(d.getDate(), 5);
    assert.strictEqual(d.getHours(), 0);
  });

  it('rejects empty, malformed and overflowed dates', () => {
    assert.strictEqual(parseDateInput(''), null);
    assert.strictEqual(parseDateInput(undefined), null);
    assert.strictEqual(parseDateInput('05/10/2026'), null);
    assert.strictEqual(parseDateInput('2026-02-31'), null);
  });

  it('falls back from completion_timestamp to reviewed_at, then null', () => {
    const a = getStageCompletionDate(stage(1, 1, 'completed', {
      completion_timestamp: '2026-10-05T10:00:00',
      reviewed_at: '2026-10-06T10:00:00',
    }));
    assert.strictEqual(a.getDate(), 5);

    const b = getStageCompletionDate(stage(2, 1, 'completed', {
      completion_timestamp: null,
      reviewed_at: '2026-10-06T10:00:00',
    }));
    assert.strictEqual(b.getDate(), 6);

    assert.strictEqual(getStageCompletionDate(stage(3, 1, 'completed')), null);
    assert.strictEqual(
      getStageCompletionDate(stage(4, 1, 'completed', { completion_timestamp: 'garbage' })),
      null
    );
  });

  it('parses API timestamps that carry microseconds (FastAPI/SQLAlchemy format)', () => {
    const d = getStageCompletionDate(stage(1, 1, 'completed', {
      completion_timestamp: '2026-10-05T10:00:00.123456',
    }));
    assert.ok(d instanceof Date && !Number.isNaN(d.getTime()));
    assert.strictEqual(d.getDate(), 5);
  });
});

describe('Team performance: period resolution', () => {
  it('this_month spans the 1st 00:00 to the last day 23:59:59.999', () => {
    const p = resolvePeriod('this_month', NOW);
    assert.strictEqual(p.valid, true);
    assert.deepStrictEqual(
      [p.start.getMonth(), p.start.getDate(), p.start.getHours()],
      [9, 1, 0]
    );
    assert.deepStrictEqual(
      [p.end.getMonth(), p.end.getDate(), p.end.getHours(), p.end.getMinutes()],
      [9, 31, 23, 59]
    );
  });

  it('last_month is the previous calendar month', () => {
    const p = resolvePeriod('last_month', NOW);
    assert.deepStrictEqual([p.start.getMonth(), p.start.getDate()], [8, 1]);
    assert.deepStrictEqual([p.end.getMonth(), p.end.getDate()], [8, 30]);
  });

  it('last_month crosses the year boundary correctly (January -> December)', () => {
    const p = resolvePeriod('last_month', new Date(2026, 0, 15));
    assert.deepStrictEqual(
      [p.start.getFullYear(), p.start.getMonth(), p.start.getDate()],
      [2025, 11, 1]
    );
    assert.deepStrictEqual(
      [p.end.getFullYear(), p.end.getMonth(), p.end.getDate()],
      [2025, 11, 31]
    );
  });

  it('this_month handles February in a non-leap year', () => {
    const p = resolvePeriod('this_month', new Date(2026, 1, 10));
    assert.strictEqual(p.end.getDate(), 28);
  });

  it('last_30 / last_7 include today and the previous N-1 days', () => {
    const p30 = resolvePeriod('last_30', NOW);
    assert.deepStrictEqual([p30.start.getMonth(), p30.start.getDate()], [8, 29]);
    assert.strictEqual(p30.end.getDate(), 28);

    const p7 = resolvePeriod('last_7', NOW);
    assert.deepStrictEqual([p7.start.getMonth(), p7.start.getDate()], [9, 22]);
  });

  it('all has no bounds', () => {
    const p = resolvePeriod('all', NOW);
    assert.deepStrictEqual([p.start, p.end, p.valid], [null, null, true]);
  });

  it('custom range is inclusive on both ends and validates ordering', () => {
    const ok = resolvePeriod('custom', NOW, '2026-10-05', '2026-10-10');
    assert.strictEqual(ok.valid, true);
    assert.strictEqual(isDateInRange(new Date(2026, 9, 5, 0, 0, 0), ok), true);
    assert.strictEqual(isDateInRange(new Date(2026, 9, 10, 23, 59, 0), ok), true);
    assert.strictEqual(isDateInRange(new Date(2026, 9, 4, 23, 59, 59), ok), false);
    assert.strictEqual(isDateInRange(new Date(2026, 9, 11, 0, 0, 0), ok), false);

    const bad = resolvePeriod('custom', NOW, '2026-10-10', '2026-10-05');
    assert.strictEqual(bad.valid, false);

    const openEnd = resolvePeriod('custom', NOW, '2026-10-05', '');
    assert.strictEqual(openEnd.valid, true);
    assert.strictEqual(openEnd.end, null);
  });
});

describe('Team performance: per-member stats', () => {
  const members = [member(1), member(2), member(3, 'head')];

  const clients = [
    client([
      // Member 1
      stage(1, 1, 'completed', { completion_timestamp: '2026-10-05T10:00:00' }),
      stage(2, 1, 'completed', { completion_timestamp: '2026-09-20T10:00:00' }), // last month
      stage(3, 1, 'completed', { completion_timestamp: '2026-10-31T23:30:00' }), // last minutes of the month
      stage(4, 1, 'completed', { completion_timestamp: null, reviewed_at: '2026-10-10T09:00:00' }), // fallback
      stage(5, 1, 'in_progress'),
      stage(6, 1, 'under_review'),
      stage(7, 1, 'revision_requested'),
      stage(8, 1, 'pending'),
      // Member 2
      stage(9, 2, 'completed', { completion_timestamp: '2026-11-01T00:00:00' }), // next month
      stage(10, 2, 'completed'), // no date at all
      // Ignored
      stage(11, null, 'in_progress'), // unassigned
      stage(12, 99, 'completed', { completion_timestamp: '2026-10-05T10:00:00' }), // not a tracked member
    ]),
  ];

  const byId = (rows, id) => rows.find(r => r.member.id === id);

  it('counts only completions inside the selected month (boundaries inclusive)', () => {
    const rows = computeMemberPerformance(members, clients, resolvePeriod('this_month', NOW));
    const m1 = byId(rows, 1);
    assert.deepStrictEqual(
      m1.completed.map(t => t.stage.id),
      [3, 4, 1] // newest first: Oct 31, Oct 10 (reviewed_at fallback), Oct 5
    );
    assert.strictEqual(byId(rows, 2).completed.length, 0);
  });

  it('last month picks only the September completion', () => {
    const rows = computeMemberPerformance(members, clients, resolvePeriod('last_month', NOW));
    assert.deepStrictEqual(byId(rows, 1).completed.map(t => t.stage.id), [2]);
  });

  it('remaining work is a live snapshot independent of the period', () => {
    const thisMonth = computeMemberPerformance(members, clients, resolvePeriod('this_month', NOW));
    const lastMonth = computeMemberPerformance(members, clients, resolvePeriod('last_month', NOW));
    for (const rows of [thisMonth, lastMonth]) {
      const m1 = byId(rows, 1);
      assert.strictEqual(m1.inProgress.length, 2); // in_progress + pending
      assert.strictEqual(m1.underReview.length, 1);
      assert.strictEqual(m1.revision.length, 1);
      assert.strictEqual(m1.remainingCount, 4);
    }
  });

  it('"all time" includes everything, including completions with no date', () => {
    const rows = computeMemberPerformance(members, clients, resolvePeriod('all', NOW));
    assert.strictEqual(byId(rows, 1).completed.length, 4);
    const m2 = byId(rows, 2);
    assert.strictEqual(m2.completed.length, 2);
    assert.strictEqual(m2.undatedCompleted, 0);
  });

  it('flags undated completions instead of silently dropping them in a date range', () => {
    const rows = computeMemberPerformance(members, clients, resolvePeriod('this_month', NOW));
    assert.strictEqual(byId(rows, 2).undatedCompleted, 1);
  });

  it('an invalid custom range yields no completions (and never throws)', () => {
    const period = resolvePeriod('custom', NOW, '2026-10-30', '2026-10-01');
    const rows = computeMemberPerformance(members, clients, period);
    assert.strictEqual(byId(rows, 1).completed.length, 0);
    assert.strictEqual(byId(rows, 1).remainingCount, 4);
  });

  it('ignores unassigned stages and members that are not tracked', () => {
    const rows = computeMemberPerformance(members, clients, resolvePeriod('all', NOW));
    const total = rows.reduce((n, r) => n + r.completed.length + r.remainingCount, 0);
    // Stages 1-10 are attributed (8 for member 1, 2 for member 2); 11 and 12 are ignored.
    assert.strictEqual(total, 10);
    assert.strictEqual(byId(rows, 3).completed.length + byId(rows, 3).remainingCount, 0);
  });

  it('keeps the caller member order and tolerates clients without stages', () => {
    const rows = computeMemberPerformance(
      members,
      [{ id: 2, name: 'X', company_name: 'Y' }, ...clients],
      resolvePeriod('all', NOW)
    );
    assert.deepStrictEqual(rows.map(r => r.member.id), [1, 2, 3]);
  });

  it('summarizes totals across members', () => {
    const rows = computeMemberPerformance(members, clients, resolvePeriod('this_month', NOW));
    const t = summarizePerformance(rows);
    assert.strictEqual(t.completed, 3);
    assert.strictEqual(t.remaining, 4);
    assert.strictEqual(t.underReview, 1);
    assert.strictEqual(t.revision, 1);
    assert.strictEqual(t.inProgress, 2);
    assert.strictEqual(t.undatedCompleted, 1);
    assert.strictEqual(t.members, 3);
  });
});

describe('Team performance: management member selection', () => {
  it('includes employees/heads, plus anyone with assigned work, excluding idle admins', () => {
    const all = [
      member(1, 'employee'),
      member(2, 'head'),
      member(3, 'manager'),
      member(4, 'admin'),
      member(5, 'super_admin'),
    ];
    const clients = [client([stage(1, 3, 'in_progress')])];
    const ids = selectPerformanceMembers(all, clients).map(m => m.id);
    assert.deepStrictEqual(ids, [1, 2, 3]);
  });
});
