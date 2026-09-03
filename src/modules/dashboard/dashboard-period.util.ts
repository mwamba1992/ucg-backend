import { BadRequestException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

/**
 * Named periods the dashboard offers. `custom` is implied when explicit
 * startDate/endDate are supplied instead of a preset.
 */
export enum PeriodPreset {
  TODAY = 'today',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  LAST_180_DAYS = '180d',
  LAST_365_DAYS = '365d',
  ALL_TIME = 'all',
  CUSTOM = 'custom',
}

export const DEFAULT_PERIOD = PeriodPreset.LAST_30_DAYS;

export interface PeriodOption {
  value: string;
  label: string;
  days: number | null;
}

/**
 * Selectable periods, exposed on every dashboard response so the UI renders the
 * picker from the API instead of hardcoding its own list.
 */
export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: PeriodPreset.TODAY, label: 'Today', days: 1 },
  { value: PeriodPreset.LAST_7_DAYS, label: 'Last 7 days', days: 7 },
  { value: PeriodPreset.LAST_30_DAYS, label: 'Last 30 days', days: 30 },
  { value: PeriodPreset.LAST_90_DAYS, label: 'Last 90 days', days: 90 },
  { value: PeriodPreset.LAST_180_DAYS, label: 'Last 180 days', days: 180 },
  { value: PeriodPreset.LAST_365_DAYS, label: 'Last 365 days', days: 365 },
  { value: PeriodPreset.ALL_TIME, label: 'All time', days: null },
];

export interface ResolvedPeriod {
  /** Preset that produced this window, or 'custom' for an explicit date range. */
  preset: PeriodPreset;
  /** Human readable window, e.g. "Last 30 days" - render this on the cards. */
  label: string;
  /** Length of the window in days, null for all time and custom ranges. */
  days: number | null;
  /** null when all time, so callers know to skip the date filter entirely. */
  startDate: Date | null;
  endDate: Date | null;
  isAllTime: boolean;
  /** The periods the caller may switch to. */
  availablePeriods: PeriodOption[];
}

/**
 * Values older clients already send, mapped onto the presets above so the
 * existing SP portal keeps working.
 */
const PERIOD_ALIASES: Record<string, PeriodPreset> = {
  '1d': PeriodPreset.TODAY,
  '7days': PeriodPreset.LAST_7_DAYS,
  '30days': PeriodPreset.LAST_30_DAYS,
  '90days': PeriodPreset.LAST_90_DAYS,
  '180days': PeriodPreset.LAST_180_DAYS,
  '365days': PeriodPreset.LAST_365_DAYS,
  year: PeriodPreset.LAST_365_DAYS,
  '1y': PeriodPreset.LAST_365_DAYS,
  alltime: PeriodPreset.ALL_TIME,
  'all-time': PeriodPreset.ALL_TIME,
};

export interface PeriodInput {
  period?: string;
  days?: number | string;
  startDate?: Date;
  endDate?: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function windowOf(days: number, end: Date): Date {
  // "Today" means from midnight today, longer windows are rolling from now.
  return days === 1
    ? startOfDay(end)
    : new Date(end.getTime() - days * MS_PER_DAY);
}

function withOptions(period: Omit<ResolvedPeriod, 'availablePeriods'>): ResolvedPeriod {
  return { ...period, availablePeriods: PERIOD_OPTIONS };
}

/**
 * Turns the query parameters into a concrete window plus the label the UI shows.
 *
 * Precedence: explicit startDate/endDate (custom) > `period` preset >
 * arbitrary `days` > the 30 day default.
 */
export function resolvePeriod(input: PeriodInput = {}): ResolvedPeriod {
  const { period, days, startDate, endDate } = input;
  const now = new Date();

  // An explicit range always wins, so existing callers keep working.
  if (startDate || endDate) {
    const start = startDate ?? null;
    const end = endDate ?? now;

    if (start && start > end) {
      throw new BadRequestException('startDate must be before endDate');
    }

    return withOptions({
      preset: PeriodPreset.CUSTOM,
      label: start
        ? `${formatDate(start)} to ${formatDate(end)}`
        : `Up to ${formatDate(end)}`,
      days: start
        ? Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY))
        : null,
      startDate: start,
      endDate: end,
      isAllTime: false,
    });
  }

  if (period) {
    const raw = String(period).trim().toLowerCase();
    const normalised = PERIOD_ALIASES[raw] ?? raw;
    const match = PERIOD_OPTIONS.find((option) => option.value === normalised);

    if (!match) {
      throw new BadRequestException(
        `Invalid period "${period}". Valid values: ` +
          `${PERIOD_OPTIONS.map((option) => option.value).join(', ')}, ` +
          `or use the days parameter for an arbitrary window.`,
      );
    }

    if (match.days === null) {
      return withOptions({
        preset: PeriodPreset.ALL_TIME,
        label: match.label,
        days: null,
        startDate: null,
        endDate: null,
        isAllTime: true,
      });
    }

    return withOptions({
      preset: match.value as PeriodPreset,
      label: match.label,
      days: match.days,
      startDate: windowOf(match.days, now),
      endDate: now,
      isAllTime: false,
    });
  }

  // Arbitrary window, e.g. days=45, for anything the presets do not cover.
  if (days !== undefined && days !== null && days !== '') {
    const parsed = Number(days);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('days must be a positive whole number');
    }

    const preset = PERIOD_OPTIONS.find((option) => option.days === parsed);

    return withOptions({
      preset: (preset?.value as PeriodPreset) ?? PeriodPreset.CUSTOM,
      label: preset?.label ?? `Last ${parsed} days`,
      days: parsed,
      startDate: windowOf(parsed, now),
      endDate: now,
      isAllTime: false,
    });
  }

  const fallback = PERIOD_OPTIONS.find((option) => option.value === DEFAULT_PERIOD);

  return withOptions({
    preset: DEFAULT_PERIOD,
    label: fallback.label,
    days: fallback.days,
    startDate: windowOf(fallback.days, now),
    endDate: now,
    isAllTime: false,
  });
}

/**
 * Applies the resolved window to a query, or leaves the query untouched when
 * the period is all time.
 */
export function applyPeriodFilter<T extends object>(
  qb: SelectQueryBuilder<T>,
  column: string,
  period: ResolvedPeriod,
): SelectQueryBuilder<T> {
  if (period.isAllTime) {
    return qb;
  }

  return qb.andWhere(`${column} BETWEEN :periodStart AND :periodEnd`, {
    periodStart: period.startDate,
    periodEnd: period.endDate,
  });
}

/** The period as returned on dashboard responses. */
export function serializePeriod(period: ResolvedPeriod) {
  return {
    preset: period.preset,
    label: period.label,
    days: period.days,
    startDate: period.startDate,
    endDate: period.endDate,
    isAllTime: period.isAllTime,
    availablePeriods: period.availablePeriods,
  };
}
