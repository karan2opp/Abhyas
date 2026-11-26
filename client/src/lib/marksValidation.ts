/**
 * Why the marks typed for one question cannot be saved, in words a teacher can act on, or null when they are fine.
 * `label` is the question's number as it is shown on screen ("Q3").
 */
export function marksProblem(label: string, value: string | undefined, max: number | undefined): string | null {
  const parsed = value === undefined ? NaN : parseFloat(value);
  if (Number.isNaN(parsed)) return `${label} has no marks yet. Type its marks, then save.`;
  if (parsed < 0) return `${label}: marks can't be negative.`;
  if (max !== undefined && parsed > max) return `${label}: marks can't be more than ${max} (you typed ${parsed}).`;
  return null;
}
