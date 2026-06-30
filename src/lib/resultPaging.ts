import { DEFAULT_RESULT_PAGE_SIZE, type ResultPagingRequest } from "../types/evaluation";

export interface RunPagingOptions {
  pageIndex?: number;
  pageNavigation?: boolean;
}

export function buildRunPaging(options?: RunPagingOptions): ResultPagingRequest | undefined {
  const pageIndex = options?.pageIndex ?? 0;

  if (!options?.pageNavigation && pageIndex === 0) {
    return undefined;
  }

  return {
    skip: pageIndex * DEFAULT_RESULT_PAGE_SIZE,
    pageSize: DEFAULT_RESULT_PAGE_SIZE,
  };
}
