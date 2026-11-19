// One page of a list, as every list in the API sends it (`parsePageParams` / `toPage` on the server).
export type Page<T> = { data: T[]; total: number; page: number; limit: number; hasMore: boolean };

// How many page buttons a list of `total` rows needs, for the Pagination component. Always at least one.
export const pageCount = (total: number, limit: number) => Math.max(1, Math.ceil(total / limit));
