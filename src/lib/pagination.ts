// Server-side pagination helper functions

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Calculate offset and limit for pagination
 */
export function getPaginationParams(page: number, limit: number) {
  if (page < 1) page = 1;
  const offset = (page - 1) * limit;
  return { offset, limit, page };
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(total: number, limit: number) {
  return Math.ceil(total / limit);
}

/**
 * Format pagination response
 */
export function formatPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: calculateTotalPages(total, limit),
  };
}
