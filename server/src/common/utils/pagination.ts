export type PageParams = { page: number; limit: number; offset: number };

// Reads ?page and ?limit from a request, keeping both within sensible bounds so a client can never ask for everything at once.
export const parsePageParams = (query: { page?: unknown; limit?: unknown }, defaultLimit = 10, maxLimit = 100): PageParams => {
    const page = Math.max(1, Math.floor(Number(query.page)) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(query.limit)) || defaultLimit));
    return { page, limit, offset: (page - 1) * limit };
};

// One page of a list, in the shape every list in the API uses.
export const toPage = <T>(data: T[], total: number, { page, limit, offset }: PageParams) => ({
    data,
    total,
    page,
    limit,
    hasMore: offset + data.length < total,
});
