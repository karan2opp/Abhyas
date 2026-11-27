// Marks and scores are shown with at most one digit after the point. Adding decimals in a computer leaves tiny errors
// (3.1 + 3 + 0.8 comes out as 6.8999999999999995), so 6.8999999999999995 shows as 6.9, 2.25 as 2.3, and 4 stays 4.
export const formatMarks = (marks: number | string | null | undefined): string => {
  const value = Number(marks ?? 0);
  return Number.isFinite(value) ? String(Math.round(value * 10) / 10) : "0";
};
