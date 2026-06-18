import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Markdown } from '@/components/ui/markdown'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/components/layout'
import { getTutorialContent } from './api'

export function Tutorial() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['tutorial-content'],
    queryFn: getTutorialContent,
  })

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto flex max-w-4xl flex-col gap-4 py-12'>
          <Skeleton className='h-8 w-[45%]' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-[90%]' />
          <Skeleton className='h-4 w-[80%]' />
        </div>
      </PublicLayout>
    )
  }

  if (!hasContent) {
    return (
      <PublicLayout>
        <div className='flex min-h-[60vh] items-center justify-center p-8'>
          <div className='max-w-2xl space-y-4 text-center'>
            <div className='flex justify-center'>
              <BookOpen className='text-muted-foreground h-20 w-20' />
            </div>
            <h2 className='text-2xl font-bold'>{t('No Tutorial Content Set')}</h2>
            <p className='text-muted-foreground'>
              {t('The administrator has not configured the tutorial yet.')}
            </p>
          </div>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-4xl px-4 py-8'>
        <Markdown className='prose-neutral dark:prose-invert max-w-none'>
          {rawContent}
        </Markdown>
      </div>
    </PublicLayout>
  )
}
