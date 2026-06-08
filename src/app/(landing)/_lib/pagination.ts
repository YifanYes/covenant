export interface PageSearchParams {
  page?: string | string[]
}

export function paginateItems<T>(items: T[], pageParam: PageSearchParams['page'], pageSize: number) {
  const rawPage = Array.isArray(pageParam) ? pageParam[0] : pageParam
  const parsedPage = Number.parseInt(rawPage ?? '1', 10)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Number.isFinite(parsedPage) ? Math.min(Math.max(parsedPage, 1), totalPages) : 1
  const startIndex = (page - 1) * pageSize

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page,
    totalPages
  }
}
