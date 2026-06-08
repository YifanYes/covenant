import { cn } from '@/lib/cn.lib'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'pixelarticons/react'

interface LandingPaginationLabels {
  previous: string
  next: string
  page: string
  currentPage: string
  status: string
}

interface LandingPaginationProps {
  basePath: string
  page: number
  totalPages: number
  labels: LandingPaginationLabels
}

const pageHref = (basePath: string, page: number) => (page === 1 ? basePath : `${basePath}?page=${page}`)

const navClass =
  'border-border bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm transition-colors'

export default function LandingPagination({ basePath, page, totalPages, labels }: LandingPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between" aria-label={labels.status}>
      <p className="text-muted-foreground text-sm">{labels.status}</p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={pageHref(basePath, page - 1)} className={navClass}>
            <ChevronLeft className="size-4" />
            {labels.previous}
          </Link>
        ) : (
          <span className={cn(navClass, 'pointer-events-none opacity-50')}>
            <ChevronLeft className="size-4" />
            {labels.previous}
          </span>
        )}

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1
            const isCurrent = pageNumber === page

            if (isCurrent) {
              return (
                <span
                  key={pageNumber}
                  aria-current="page"
                  aria-label={`${labels.currentPage} ${pageNumber}`}
                  className="bg-primary text-primary-foreground inline-flex size-9 items-center justify-center rounded-md text-sm font-medium"
                >
                  {pageNumber}
                </span>
              )
            }

            return (
              <Link
                key={pageNumber}
                href={pageHref(basePath, pageNumber)}
                aria-label={`${labels.page} ${pageNumber}`}
                className="border-border bg-background hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md border text-sm transition-colors"
              >
                {pageNumber}
              </Link>
            )
          })}
        </div>

        {page < totalPages ? (
          <Link href={pageHref(basePath, page + 1)} className={navClass}>
            {labels.next}
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(navClass, 'pointer-events-none opacity-50')}>
            {labels.next}
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  )
}
