/**
 * Team Performance Helpers
 *
 * Pure functions (no React, no network) that compute per-employee productivity
 * from the clients/stages data already loaded by the app.
 *
 * Semantics (kept deliberately simple & explicit):
 *  - "Completed in period": stages with status === 'completed' whose completion
 *    date (completion_timestamp, falling back to reviewed_at) falls inside the
 *    selected period. Attributed to the stage's CURRENT assigned member.
 *  - "Remaining": a live snapshot of the member's not-yet-completed stages. It is
 *    NOT affected by the selected period.
 */
import type { Client, TaskStage, TeamMember } from '../types';

export type PeriodPreset =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'last_30'
  | 'last_7'
  | 'custom';

export interface PeriodRange {
  /** Inclusive lower bound (null = open). */
  start: Date | null;
  /** Inclusive upper bound (null = open). */
  end: Date | null;
  /** false when a custom range is contradictory (from > to). */
  valid: boolean;
}

export interface PerformanceTask {
  client: Client;
  stage: TaskStage;
  /** Resolved completion date (only meaningful for completed stages). */
  completedAt: Date | null;
}

export interface MemberPerformance {
  member: TeamMember;
  /** Completed inside the selected period, newest first. */
  completed: PerformanceTask[];
  /** pending + in_progress (+ any unknown non-completed status). */
  inProgress: PerformanceTask[];
  /** under_review: waiting for approval. */
  underReview: PerformanceTask[];
  /** revision_requested: sent back to the employee. */
  revision: PerformanceTask[];
  /** inProgress + underReview + revision. */
  remainingCount: number;
  /**
   * Completed stages that have no usable completion date. They cannot be placed
   * in a date range, so they are only counted when the period is "all".
   */
  undatedCompleted: number;
}

export interface PerformanceTotals {
  completed: number;
  remaining: number;
  underReview: number;
  revision: number;
  inProgress: number;
  undatedCompleted: number;
  members: number;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  all: 'كل الأوقات',
  this_month: 'هذا الشهر',
  last_month: 'الشهر الماضي',
  last_30: 'آخر 30 يوماً',
  last_7: 'آخر 7 أيام',
  custom: 'فترة مخصصة',
};

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const endOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/**
 * Parses a <input type="date"> value ("YYYY-MM-DD") as a LOCAL date.
 * (new Date("YYYY-MM-DD") would be parsed as UTC and shift the day.)
 */
export function parseDateInput(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  // Reject overflowed dates such as 2026-02-31
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/** Safely parses an API timestamp. Returns null for empty/invalid values. */
export function parseStageDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The date a stage was completed (completion_timestamp, else reviewed_at). */
export function getStageCompletionDate(stage: TaskStage): Date | null {
  return parseStageDate(stage.completion_timestamp) ?? parseStageDate(stage.reviewed_at);
}

export function resolvePeriod(
  preset: PeriodPreset,
  now: Date = new Date(),
  customFrom?: string,
  customTo?: string
): PeriodRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'all':
      return { start: null, end: null, valid: true };
    case 'this_month':
      return {
        start: new Date(y, m, 1),
        end: endOfDay(new Date(y, m + 1, 0)),
        valid: true,
      };
    case 'last_month':
      return {
        start: new Date(y, m - 1, 1),
        end: endOfDay(new Date(y, m, 0)),
        valid: true,
      };
    case 'last_30':
      // Today + the previous 29 days = 30 calendar days.
      return {
        start: startOfDay(new Date(y, m, d - 29)),
        end: endOfDay(now),
        valid: true,
      };
    case 'last_7':
      return {
        start: startOfDay(new Date(y, m, d - 6)),
        end: endOfDay(now),
        valid: true,
      };
    case 'custom': {
      const from = parseDateInput(customFrom);
      const to = parseDateInput(customTo);
      const start = from ? startOfDay(from) : null;
      const end = to ? endOfDay(to) : null;
      const valid = !(start && end && start.getTime() > end.getTime());
      return { start, end, valid };
    }
    default:
      return { start: null, end: null, valid: true };
  }
}

export function isDateInRange(date: Date, range: PeriodRange): boolean {
  if (range.start && date.getTime() < range.start.getTime()) return false;
  if (range.end && date.getTime() > range.end.getTime()) return false;
  return true;
}

/** True when the range has no bounds at all (equivalent to "all time"). */
export function isOpenRange(range: PeriodRange): boolean {
  return range.start === null && range.end === null;
}

/**
 * Which members belong in a management-level (all agency) performance view:
 * every employee / team head, plus anyone else (e.g. a manager) that actually
 * has stages assigned, so no tracked work is ever hidden.
 */
export function selectPerformanceMembers(
  members: TeamMember[],
  clients: Client[]
): TeamMember[] {
  const assignedIds = new Set<number>();
  clients.forEach(c =>
    (c.stages || []).forEach(s => {
      if (s.assigned_member_id != null) assignedIds.add(s.assigned_member_id);
    })
  );
  return members.filter(
    m => m.role_type === 'employee' || m.role_type === 'head' || assignedIds.has(m.id)
  );
}

export function computeMemberPerformance(
  members: TeamMember[],
  clients: Client[],
  period: PeriodRange
): MemberPerformance[] {
  const buckets = new Map<number, MemberPerformance>();
  members.forEach(member => {
    buckets.set(member.id, {
      member,
      completed: [],
      inProgress: [],
      underReview: [],
      revision: [],
      remainingCount: 0,
      undatedCompleted: 0,
    });
  });

  const openRange = isOpenRange(period);

  clients.forEach(client => {
    (client.stages || []).forEach(stage => {
      if (stage.assigned_member_id == null) return;
      const bucket = buckets.get(stage.assigned_member_id);
      if (!bucket) return;

      if (stage.status === 'completed') {
        const completedAt = getStageCompletionDate(stage);
        if (!completedAt) {
          if (openRange && period.valid) {
            bucket.completed.push({ client, stage, completedAt: null });
          } else {
            bucket.undatedCompleted += 1;
          }
          return;
        }
        if (period.valid && isDateInRange(completedAt, period)) {
          bucket.completed.push({ client, stage, completedAt });
        }
        return;
      }

      const task: PerformanceTask = { client, stage, completedAt: null };
      if (stage.status === 'under_review') {
        bucket.underReview.push(task);
      } else if (stage.status === 'revision_requested') {
        bucket.revision.push(task);
      } else {
        // pending, in_progress and any unexpected status stay visible as remaining work
        bucket.inProgress.push(task);
      }
    });
  });

  const result: MemberPerformance[] = [];
  buckets.forEach(b => {
    b.completed.sort((a, c) => {
      const at = a.completedAt ? a.completedAt.getTime() : -Infinity;
      const ct = c.completedAt ? c.completedAt.getTime() : -Infinity;
      return ct - at;
    });
    b.remainingCount = b.inProgress.length + b.underReview.length + b.revision.length;
    result.push(b);
  });

  // Preserve the caller's member order.
  const order = new Map<number, number>();
  members.forEach((m, i) => order.set(m.id, i));
  result.sort((a, b) => (order.get(a.member.id) ?? 0) - (order.get(b.member.id) ?? 0));
  return result;
}

export function summarizePerformance(rows: MemberPerformance[]): PerformanceTotals {
  return rows.reduce<PerformanceTotals>(
    (acc, r) => {
      acc.completed += r.completed.length;
      acc.remaining += r.remainingCount;
      acc.underReview += r.underReview.length;
      acc.revision += r.revision.length;
      acc.inProgress += r.inProgress.length;
      acc.undatedCompleted += r.undatedCompleted;
      acc.members += 1;
      return acc;
    },
    {
      completed: 0,
      remaining: 0,
      underReview: 0,
      revision: 0,
      inProgress: 0,
      undatedCompleted: 0,
      members: 0,
    }
  );
}
