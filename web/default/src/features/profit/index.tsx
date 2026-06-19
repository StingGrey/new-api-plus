/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { SectionPageLayout } from '@/components/layout'
import { getProfitSummary } from './api'
import { DividendRecordsTable } from './components/dividend-records-table'
import { ProfitChart } from './components/profit-chart'
import { ProfitStatCards } from './components/profit-stat-cards'

export function Profit() {
  const { t } = useTranslation()
  const { data: summary, isLoading } = useQuery({
    queryKey: ['profit-summary'],
    queryFn: async () => {
      const res = await getProfitSummary()
      if (!res.success || !res.data) {
        return null
      }
      return res.data
    },
  })

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Profit Dashboard')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-7xl flex-col gap-4'>
          <p className='text-muted-foreground text-sm'>
            {t(
              'Consumption and cost are real-time; gross profit, dividends and net profit are T+1-settled figures.'
            )}
          </p>
          <ProfitStatCards summary={summary ?? null} loading={isLoading} />
          <ProfitChart summary={summary ?? null} loading={isLoading} />
          <div className='overflow-hidden rounded-lg border'>
            <div className='border-b px-4 py-3 text-sm font-semibold'>
              {t('Dividend Records')}
            </div>
            <div className='p-3'>
              <DividendRecordsTable />
            </div>
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
