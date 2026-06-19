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
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Crown,
  HandCoins,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProfitSummary } from '../types'

interface ProfitStatCardsProps {
  summary: ProfitSummary | null
  loading?: boolean
}

type StatItem = {
  label: string
  value: string
  description: string
  icon: typeof Wallet
  tone: 'default' | 'positive' | 'negative' | 'accent'
}

export function ProfitStatCards({ summary, loading }: ProfitStatCardsProps) {
  const { t } = useTranslation()

  if (loading || !summary) {
    return (
      <div className='overflow-hidden rounded-lg border'>
        <div className='divide-border/60 grid grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-4'>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className='px-3 py-3 sm:px-5 sm:py-4'>
              <Skeleton className='h-3.5 w-20' />
              <Skeleton className='mt-2 h-7 w-24' />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stats: StatItem[] = [
    {
      label: t('Total Consumption'),
      value: formatQuota(summary.total_consume),
      description: t('Real-time, all logs'),
      icon: Receipt,
      tone: 'default',
    },
    {
      label: t('Total Cost'),
      value: formatQuota(summary.total_cost),
      description: t('Real-time, all logs'),
      icon: Coins,
      tone: 'default',
    },
    {
      label: t('Settled Gross Profit'),
      value: formatQuota(summary.settled_gross),
      description: t('T+1 settled'),
      icon: TrendingUp,
      tone: 'accent',
    },
    {
      label: t('Referral Rebate'),
      value: formatQuota(summary.affiliate_rebate),
      description: t('Paid to referrers'),
      icon: HandCoins,
      tone: 'negative',
    },
    {
      label: t('Admin Dividend'),
      value: formatQuota(summary.admin_dividend),
      description: t('Paid to admins'),
      icon: Wallet,
      tone: 'negative',
    },
    {
      label: t('Root Dividend'),
      value: formatQuota(summary.root_dividend),
      description: t('10% of gross profit'),
      icon: Crown,
      tone: 'negative',
    },
    {
      label: t('Net Profit'),
      value: formatQuota(summary.net_profit),
      description: t('Platform net = gross - all dividends'),
      icon: summary.net_profit >= 0 ? ArrowUpRight : ArrowDownRight,
      tone: summary.net_profit >= 0 ? 'positive' : 'negative',
    },
  ]

  const toneClass: Record<StatItem['tone'], string> = {
    default: 'text-foreground',
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    accent: 'text-primary',
  }

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='divide-border/60 grid grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-4'>
        {stats.map((item) => (
          <div key={item.label} className='px-3 py-3 sm:px-5 sm:py-4'>
            <div className='flex items-center gap-2'>
              <item.icon className='text-muted-foreground/60 size-3.5 shrink-0' />
              <div className='text-muted-foreground truncate text-xs font-medium tracking-wider uppercase'>
                {item.label}
              </div>
            </div>
            <div
              className={`mt-1.5 font-mono text-base font-bold tracking-tight break-all tabular-nums sm:mt-2 sm:text-2xl ${toneClass[item.tone]}`}
            >
              {item.value}
            </div>
            <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
