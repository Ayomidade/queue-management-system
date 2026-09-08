/**
 * Parse pagination params from query string.
 * @param {Object} query - req.query
 * @param {Object} opts - defaults
 * @param {number} opts.defaultLimit - default page size (default 25)
 * @param {number} opts.maxLimit - cap on page size (default 100)
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const parsePagination = (query, { defaultLimit = 25, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Format a paginated response.
 * @param {Array} docs - the slice of documents
 * @param {number} total - total count matching the filter
 * @param {number} page - current page
 * @param {number} limit - page size
 * @returns {{ data: Array, meta: { page, limit, total, totalPages } }}
 */
export const paginatedResponse = (docs, total, page, limit) => ({
  data: docs,
  meta: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});
