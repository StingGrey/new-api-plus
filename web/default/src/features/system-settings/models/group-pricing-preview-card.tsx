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
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { StaticDataTable } from '@/components/data-table'
import { useAuthStore } from '@/stores/auth-store'
import { ROLE } from '@/lib/roles'
import { useSystemOptions } from '../hooks/use-system-options'
import { getGroupPricingPreview } from '../api'

type PreviewItem = {
  model: string
  billing_mode: string
  has_price: boolean
  base_input_price_per_m?: number
  final_input_price_per_m?: number
  base_request_price?: number
  final_request_price?: number
  gross_margin?: number
  enabled_channel_count: number
  total_channel_count: number
  statuses: string[]
}

function formatMoney(n: number | undefined | null): string {
  if (n === undefined || n === null) return '-'
  if (n === 0) return '0'
  if (Math.abs(n) >= 1) return `$${n.toFixed(4)}`
  return `$${n.toFixed(6)}`
}

function formatPercent(n: number | undefined | null): string {
  if (n === undefined || n === null) return '-'
  return `${(n * 100).toFixed(1)}%`
}

// GroupPricingPreviewCard 分组定价预览表: 展示每个模型在某分组下的实际售价/成本/毛利,
// 用于运营核对「官方价 × 分组倍率」后有没有配错。成本/毛利仅 Root 可见。
export function GroupPricingPreviewCard() {
  const { t } = useTranslation()
  const isRoot =
    (useAuthStore((s) => s.auth.user)?.role ?? 0) >= ROLE.SUPER_ADMIN
  const { data: resp } = useSystemOptions()

  const groups = useMemo(() => {
    const opt = resp?.data?.find((o) => o.key === 'GroupRatio')
    if (!opt) return ['default']
    try {
      const parsed = JSON.parse(opt.value) as Record<string, number>
      const keys = Object.keys(parsed)
      return keys.length > 0 ? keys : ['default']
    } catch {
      return ['default']
    }
  }, [resp])

  const [selectedGroup, setSelectedGroup] = useState('default')
  const [search, setSearch] = useState('')
  const [includeDisabled, setIncludeDisabled] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['group-pricing-preview', selectedGroup, includeDisabled],
    queryFn: () => getGroupPricingPreview(selectedGroup, includeDisabled),
    enabled: groups.length > 0,
  })

  const preview = data?.data
  const isAuto = preview?.is_auto === true

  const filteredItems = useMemo(() => {
    const items = (preview?.items ?? []) as PreviewItem[]
    return items.filter((item) => {
      if (
        search.trim() &&
        !item.model.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false
      }
      if (statusFilter !== 'all' && !item.statuses.includes(statusFilter)) {
        return false
      }
      return true
    })
  }, [preview, search, statusFilter])

  const saleRatio = preview?.sale_ratio
  const costRatio = preview?.cost_ratio
  const costRatioSource = preview?.cost_ratio_source

  return (
    <Card className='shadow-sm ring-0'>
      <CardHeader className='border-b bg-muted/20'>
        <div>
          <CardTitle>{t('Group model pricing preview')}</CardTitle>
          <CardDescription>
            {t(
              'Verify each model actual sale price and cost under the selected group (official price × group ratio).'
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='space-y-4 pt-4'>
        <div className='flex flex-wrap items-end gap-4'>
          <div className='space-y-1'>
            <Label className='text-xs'>{t('Group')}</Label>
            <select
              className='bg-background h-9 rounded-md border px-3 text-sm'
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                  {g === 'auto' ? ` (${t('auto')})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>{t('Search model')}</Label>
            <Input
              className='h-9 w-56'
              placeholder={t('Model name')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>{t('Status')}</Label>
            <select
              className='bg-background h-9 rounded-md border px-3 text-sm'
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value='all'>{t('All')}</option>
              <option value='normal'>{t('Normal')}</option>
              <option value='loss'>{t('Loss')}</option>
              <option value='missing_price'>{t('Missing price')}</option>
              <option value='no_enabled_channel'>
                {t('No available channel')}
              </option>
            </select>
          </div>
          <div className='flex items-center gap-2 pb-2'>
            <Switch
              checked={includeDisabled}
              onCheckedChange={setIncludeDisabled}
              id='include-disabled'
            />
            <Label htmlFor='include-disabled' className='text-sm'>
              {t('Include disabled channels')}
            </Label>
          </div>
        </div>

        {!isAuto && saleRatio !== undefined && (
          <div className='text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm'>
            <span>
              {t('Sale ratio')}: <strong>{saleRatio}</strong>
            </span>
            {isRoot && costRatio !== undefined && (
              <span>
                {t('Cost ratio')}: <strong>{costRatio}</strong>
                {costRatioSource === 'inherited' &&
                  ` (${t('Inherit sale ratio')})`}
              </span>
            )}
          </div>
        )}

        {isLoading && (
          <p className='text-muted-foreground text-sm'>{t('Loading...')}</p>
        )}
        {isError && (
          <p className='text-destructive text-sm'>
            {t('Failed to load preview')}
          </p>
        )}

        {isAuto ? (
          <p className='text-muted-foreground rounded-md border border-dashed p-4 text-sm'>
            {preview?.message ||
              t(
                'auto is an automatic group; select a concrete group to view final prices.'
              )}
          </p>
        ) : (
          !isLoading &&
          !isError && (
            <StaticDataTable
              data={filteredItems}
              getRowKey={(row) => row.model}
              emptyContent={t('No models found.')}
              columns={[
                {
                  id: 'model',
                  header: t('Model'),
                  className: 'min-w-40',
                  cell: (row) => (
                    <span className='font-medium'>{row.model}</span>
                  ),
                },
                {
                  id: 'mode',
                  header: t('Billing mode'),
                  className: 'w-28',
                  cell: (row) => (
                    <span className='text-muted-foreground text-xs'>
                      {row.billing_mode === 'fixed'
                        ? t('Per request')
                        : row.billing_mode === 'expression'
                          ? t('Expression')
                          : t('Per token')}
                    </span>
                  ),
                },
                {
                  id: 'base',
                  header: t('Official price'),
                  className: 'w-28',
                  cell: (row) => (
                    <span className='text-sm'>
                      {row.billing_mode === 'fixed'
                        ? formatMoney(row.base_request_price)
                        : row.billing_mode === 'expression'
                          ? '-'
                          : `${formatMoney(row.base_input_price_per_m)}/M`}
                    </span>
                  ),
                },
                {
                  id: 'sale',
                  header: t('Actual sale price'),
                  className: 'w-28',
                  cell: (row) => {
                    const sale =
                      row.billing_mode === 'fixed'
                        ? undefined
                        : row.billing_mode === 'expression'
                          ? undefined
                          : (row as PreviewItem).final_input_price_per_m
                    const finalRequest = (row as PreviewItem).final_request_price
                    return (
                      <span className='text-sm'>
                        {row.billing_mode === 'fixed'
                          ? formatMoney(finalRequest)
                          : row.billing_mode === 'expression'
                            ? '-'
                            : `${formatMoney(sale)}/M`}
                      </span>
                    )
                  },
                },
                ...(isRoot
                  ? [
                      {
                        id: 'cost',
                        header: t('Actual cost'),
                        className: 'w-28',
                        cell: (row: PreviewItem) => {
                          const cost =
                            row.billing_mode === 'fixed'
                              ? undefined
                              : row.billing_mode === 'expression'
                                ? undefined
                                : (
                                    row as PreviewItem & {
                                      final_input_cost_per_m?: number
                                    }
                                  ).final_input_cost_per_m
                          const finalRequestCost = (
                            row as PreviewItem & {
                              final_request_cost?: number
                            }
                          ).final_request_cost
                          return (
                            <span className='text-sm'>
                              {row.billing_mode === 'fixed'
                                ? formatMoney(finalRequestCost)
                                : row.billing_mode === 'expression'
                                  ? '-'
                                  : `${formatMoney(cost)}/M`}
                            </span>
                          )
                        },
                      },
                      {
                        id: 'margin',
                        header: t('Gross margin'),
                        className: 'w-24',
                        cell: (row: PreviewItem) => {
                          const margin = (row as PreviewItem).gross_margin
                          const loss =
                            margin !== undefined && margin < 0
                          return (
                            <span
                              className={`text-sm font-medium ${loss ? 'text-destructive' : ''}`}
                            >
                              {formatPercent(margin)}
                            </span>
                          )
                        },
                      },
                    ]
                  : []),
                {
                  id: 'channels',
                  header: t('Channels'),
                  className: 'w-24',
                  cell: (row) => (
                    <span className='text-muted-foreground text-xs'>
                      {includeDisabled
                        ? `${row.total_channel_count} (${row.enabled_channel_count} ${t('enabled')})`
                        : `${row.enabled_channel_count}`}
                    </span>
                  ),
                },
                {
                  id: 'status',
                  header: t('Status'),
                  className: 'w-32',
                  cell: (row) => {
                    const hasLoss = row.statuses.includes('loss')
                    const hasMissing = row.statuses.includes('missing_price')
                    const hasNoChannel = row.statuses.includes(
                      'no_enabled_channel'
                    )
                    return (
                      <span
                        className={`text-xs ${hasLoss ? 'text-destructive' : hasMissing || hasNoChannel ? 'text-amber-600' : 'text-muted-foreground'}`}
                      >
                        {row.statuses
                          .map((s) =>
                            s === 'normal'
                              ? t('Normal')
                              : s === 'loss'
                                ? t('Loss')
                                : s === 'missing_price'
                                  ? t('Missing price')
                                  : s === 'no_enabled_channel'
                                    ? t('No available channel')
                                    : s === 'only_disabled_channels'
                                      ? t('Disabled channels only')
                                      : s === 'cost_ratio_inherited'
                                        ? t('Inherit sale ratio')
                                        : s === 'group_ratio_default'
                                          ? t('Default ratio')
                                          : s
                          )
                          .join(', ')}
                      </span>
                    )
                  },
                },
              ]}
            />
          )
        )}

        {isRoot ? null : (
          <p className='text-muted-foreground text-xs'>
            {t('Cost is visible to super admin only')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
