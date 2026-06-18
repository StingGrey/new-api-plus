import { useMemo, useState } from 'react'
import { HelpCircle, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Markdown } from '@/components/ui/markdown'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { PublicLayout } from '@/components/layout'
import { useFAQ } from '@/features/dashboard/hooks/use-status-data'
import type { FAQItem } from '@/features/dashboard/types'

// FAQ 常见问题独立页(从概览迁出 + 美化): 搜索框 + 编号卡片 + Markdown 渲染。
export function FAQ() {
  const { t } = useTranslation()
  const { items: list, loading } = useFAQ()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(
      (item: FAQItem) =>
        item.question?.toLowerCase().includes(q) ||
        item.answer?.toLowerCase().includes(q)
    )
  }, [list, query])

  return (
    <PublicLayout>
      <div className='mx-auto max-w-3xl px-4 py-10'>
        <div className='mb-8 text-center'>
          <div className='mb-3 flex justify-center'>
            <HelpCircle className='text-primary h-12 w-12' />
          </div>
          <h1 className='text-3xl font-bold'>{t('FAQ')}</h1>
          <p className='text-muted-foreground mt-2'>
            {t('Answers for common access and billing questions')}
          </p>
        </div>

        <div className='relative mb-6'>
          <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search FAQs...')}
            className='pl-9'
          />
        </div>

        {loading ? (
          <div className='space-y-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-20 w-full' />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className='text-muted-foreground py-16 text-center'>
            {query ? t('No matching FAQs') : t('No FAQ entries available')}
          </div>
        ) : (
          <div className='space-y-3'>
            {filtered.map((item: FAQItem, idx: number) => (
              <div
                key={item.id ?? `faq-${idx}`}
                className='bg-card rounded-lg border p-5'
              >
                <div className='mb-2 flex items-start gap-3'>
                  <span className='bg-primary/10 text-primary mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold'>
                    {idx + 1}
                  </span>
                  <Markdown className='text-base leading-relaxed font-semibold'>
                    {item.question}
                  </Markdown>
                </div>
                <Markdown className='text-muted-foreground ml-9 text-sm leading-relaxed'>
                  {item.answer}
                </Markdown>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
