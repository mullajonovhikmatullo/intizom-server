export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 200;

export type PaginationInput = {
  page: number;
  limit: number;
};

export const toPagination = ({ page, limit }: PaginationInput) => ({
  skip: (page - 1) * limit,
  take: limit,
});
