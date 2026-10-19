import { Option } from '@/ui/components';

export function options<T extends string>(values: readonly T[], labels: Record<T, string>, hints?: Partial<Record<T, string | null>>): Option<T>[] {
  return values.map((v) => ({ value: v, label: labels[v], hint: hints?.[v] ?? null }));
}

export const strOf = (n: number | null | undefined, decimals?: number): string =>
  n === null || n === undefined ? '' : decimals === undefined ? String(n) : String(Number(n.toFixed(decimals)));
