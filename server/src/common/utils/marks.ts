// Marks are kept to one digit after the point. Adding decimals in a computer leaves tiny errors (3.1 + 3 + 0.8 comes out
// as 6.8999999999999995), so every mark and total is rounded before it is saved.
export const roundMarks = (marks: number): number => Math.round(marks * 10) / 10;

/** The total of a submission's marks, rounded. An answer with no marks yet counts as 0. */
export const sumMarks = (rows: { marksAwarded: number | null }[]): number =>
    roundMarks(rows.reduce((sum, row) => sum + (row.marksAwarded ?? 0), 0));
