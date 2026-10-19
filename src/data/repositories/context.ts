import { SqlDriver } from '../db/driver';

/** Injected dependencies so repositories stay deterministic under test. */
export interface RepoContext {
  db: SqlDriver;
  newId: () => string;
  now: () => Date;
  /** IANA zone used for local calendar dates; undefined = device zone. */
  timeZone?: string;
}

export const nowIso = (ctx: RepoContext) => ctx.now().toISOString();

export const json = {
  stringify: (v: unknown) => (v === null || v === undefined ? null : JSON.stringify(v)),
  parse: <T>(s: string | null): T | null => (s === null ? null : (JSON.parse(s) as T)),
};
