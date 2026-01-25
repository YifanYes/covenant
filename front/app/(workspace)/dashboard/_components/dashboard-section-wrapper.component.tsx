'use client'
import Button from '@/ui/button.component'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.component'
import { parseTranslationKey } from '@/utils/locale.utils'
import { type ReactNode } from 'react'
import { Link } from 'next/navigation'

interface DashboardSectionWrapperComponentProps {
  title: string
  description?: string
  icon: any
  iconColorClass?: string
  linkTo?: string
  linkText?: string
  children: ReactNode
  className?: string
  contentClassName?: string
}

export default function DashboardSectionWrapperComponent({
  title,
  description,
  icon: Icon,
  iconColorClass,
  linkTo,
  linkText,
  children,
  className,
  contentClassName
}: DashboardSectionWrapperComponentProps) {
  return (
    <Card className={`col-span-1 flex h-full flex-col gap-2 ${className}`}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3'>
        <div className='space-y-1'>
          <CardTitle className='flex items-center gap-2'>
            <Icon className={`h-5 w-5 ${iconColorClass}`} />
            {parseTranslationKey(title)}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {linkTo && linkText && (
          <Button variant='ghost' size='sm' className='h-8 text-xs' asChild>
            <Link to={linkTo}>{linkText}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className={`flex flex-1 flex-col ${contentClassName}`}>{children}</CardContent>
    </Card>
  )
}
