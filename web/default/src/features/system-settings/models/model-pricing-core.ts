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
import * as z from 'zod'
import { combineBillingExpr } from '@/features/pricing/lib/billing-expr'
import { formatPricingNumber } from './pricing-format'

export const createModelPricingSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('Model name is required')),
    price: z.string().optional(),
    ratio: z.string().optional(),
    cacheRatio: z.string().optional(),
    createCacheRatio: z.string().optional(),
    completionRatio: z.string().optional(),
    imageRatio: z.string().optional(),
    audioRatio: z.string().optional(),
    audioCompletionRatio: z.string().optional(),
    // 成本价（平台买入价 $/1M tokens），与售价完全分离，仅超管可写。
    costInput: z.string().optional(),
    costOutput: z.string().optional(),
    costCache: z.string().optional(),
    // 倍率定价模式（multiplier）：官方价 + 销售/成本倍率，提交时换算成上面的 ratio/cost。
    officialInput: z.string().optional(),
    officialOutput: z.string().optional(),
    officialCacheRead: z.string().optional(),
    officialCacheWrite: z.string().optional(),
    saleMultiplier: z.string().optional(),
    costMultiplier: z.string().optional(),
  })

export type ModelPricingFormValues = z.infer<
  ReturnType<typeof createModelPricingSchema>
>

export type PricingMode = 'per-token' | 'per-request' | 'tiered_expr' | 'multiplier'

export type LaneKey =
  | 'completion'
  | 'cache'
  | 'createCache'
  | 'image'
  | 'audioInput'
  | 'audioOutput'

export type ModelRatioData = {
  name: string
  price?: string
  ratio?: string
  cacheRatio?: string
  createCacheRatio?: string
  completionRatio?: string
  imageRatio?: string
  audioRatio?: string
  audioCompletionRatio?: string
  billingMode?: PricingMode
  billingExpr?: string
  requestRuleExpr?: string
  // 成本价（平台买入价 $/1M tokens），与售价完全分离，仅超管可写。
  // 编辑态用 string（输入框），序列化时 parseFloat 成 number。
  costInput?: string
  costOutput?: string
  costCache?: string
  // 倍率定价模式（multiplier）专用：官方价 $/1M + 销售/成本倍率（编辑态 string）。
  // 仅 multiplier 模式填充；提交时 convertMultiplierToRatioData 换算成上面的 ratio/cost。
  officialInput?: string
  officialOutput?: string
  officialCacheRead?: string
  officialCacheWrite?: string
  saleMultiplier?: string
  costMultiplier?: string
}

// 后端 option key "ModelCost" 的 JSON 值结构（嵌套对象 map），对应
// setting/ratio_setting/model_cost.go 的 ModelCostInfo（float64 $/1M tokens）。
// 售价是扁平 Record<string, number>，成本是 Record<string, ModelCostInfo>，结构不同，不能混用。
export type ModelCostInfo = {
  input_cost_per_m: number
  output_cost_per_m: number
  cache_cost_per_m?: number
}

// 后端 option key "ModelPricingSource" 的 JSON 值结构（嵌套对象 map），对应
// setting/ratio_setting/model_pricing_source.go 的 ModelPricingSource。
// 倍率定价模式的编辑态来源：官方价(4项 $/1M) + 销售倍率 + 成本倍率。
// 仅用于前端 UI 还原，计费引擎不读（计费仍走 ModelRatio/ModelCost）。
export type ModelPricingSource = {
  official_input: number
  official_output: number
  official_cache_read: number
  official_cache_write: number
  sale_multiplier: number
  cost_multiplier: number
}

export type PreviewRow = {
  key: string
  label: string
  value: string
  multiline?: boolean
}

export const numericDraftRegex = /^(\d+(\.\d*)?|\.\d*)?$/

export const EMPTY_LANE_PRICES: Record<LaneKey, string> = {
  completion: '',
  cache: '',
  createCache: '',
  image: '',
  audioInput: '',
  audioOutput: '',
}

export const EMPTY_LANE_ENABLED: Record<LaneKey, boolean> = {
  completion: false,
  cache: false,
  createCache: false,
  image: false,
  audioInput: false,
  audioOutput: false,
}

export const ratioFieldByLane: Record<LaneKey, keyof ModelPricingFormValues> = {
  completion: 'completionRatio',
  cache: 'cacheRatio',
  createCache: 'createCacheRatio',
  image: 'imageRatio',
  audioInput: 'audioRatio',
  audioOutput: 'audioCompletionRatio',
}

export const laneConfigs: Array<{
  key: LaneKey
  titleKey: string
  descriptionKey: string
  placeholder: string
}> = [
  {
    key: 'completion',
    titleKey: 'Completion price',
    descriptionKey: 'Output token price for generated tokens.',
    placeholder: '15',
  },
  {
    key: 'cache',
    titleKey: 'Cache read price',
    descriptionKey: 'Token price for cache reads.',
    placeholder: '0.3',
  },
  {
    key: 'createCache',
    titleKey: 'Cache write price',
    descriptionKey: 'Token price for creating cache entries.',
    placeholder: '3.75',
  },
  {
    key: 'image',
    titleKey: 'Image input price',
    descriptionKey: 'Token price for image input.',
    placeholder: '2.5',
  },
  {
    key: 'audioInput',
    titleKey: 'Audio input price',
    descriptionKey: 'Token price for audio input.',
    placeholder: '3.81',
  },
  {
    key: 'audioOutput',
    titleKey: 'Audio output price',
    descriptionKey: 'Token price for audio output.',
    placeholder: '15.11',
  },
]

export function hasValue(value: unknown): boolean {
  return (
    value !== '' && value !== null && value !== undefined && value !== false
  )
}

export function toNumberOrNull(value: unknown): number | null {
  if (!hasValue(value) && value !== 0) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function ratioToBasePrice(ratio: unknown): string {
  const num = toNumberOrNull(ratio)
  if (num === null) return ''
  return formatPricingNumber(num * 2)
}

function deriveLanePrice(
  ratio: unknown,
  denominator: unknown,
  fallback = ''
): string {
  const ratioNumber = toNumberOrNull(ratio)
  const denominatorNumber = toNumberOrNull(denominator)
  if (ratioNumber === null || denominatorNumber === null) return fallback
  return formatPricingNumber(ratioNumber * denominatorNumber)
}

export function createInitialLaneState(data?: ModelRatioData | null) {
  if (!data) {
    return {
      promptPrice: '',
      prices: { ...EMPTY_LANE_PRICES },
      enabled: { ...EMPTY_LANE_ENABLED },
    }
  }

  const promptPrice = ratioToBasePrice(data.ratio)
  const audioInputPrice = deriveLanePrice(data.audioRatio, promptPrice)
  const prices: Record<LaneKey, string> = {
    completion: deriveLanePrice(data.completionRatio, promptPrice),
    cache: deriveLanePrice(data.cacheRatio, promptPrice),
    createCache: deriveLanePrice(data.createCacheRatio, promptPrice),
    image: deriveLanePrice(data.imageRatio, promptPrice),
    audioInput: audioInputPrice,
    audioOutput: deriveLanePrice(data.audioCompletionRatio, audioInputPrice),
  }

  return {
    promptPrice,
    prices,
    enabled: {
      completion: hasValue(data.completionRatio),
      cache: hasValue(data.cacheRatio),
      createCache: hasValue(data.createCacheRatio),
      image: hasValue(data.imageRatio),
      audioInput: hasValue(data.audioRatio),
      audioOutput: hasValue(data.audioCompletionRatio),
    },
  }
}

// multiplier 模式编辑态（官方价 + 倍率），由 createInitialMultiplierState 从 ModelRatioData 还原。
export type MultiplierLaneState = {
  officialPrices: {
    input: string
    output: string
    cacheRead: string
    cacheWrite: string
  }
  saleMultiplier: string
  costMultiplier: string
  isApproximate: boolean
}

// multiplier 模式 → 现有 ratio/cost 正向换算（提交时用）。返回值填进 ModelRatioData 落盘。
// 公式: ModelRatio = official_input × sale_multiplier / 2 (USD=500, ratio×2=$/1M);
//       CompletionRatio = official_output/official_input 等(lane 相对 input 的倍数);
//       ModelCost = 官方价 × cost_multiplier (绝对 $/1M)。
export function convertMultiplierToRatioData(
  data: ModelRatioData
): Partial<ModelRatioData> {
  const officialInput = toNumberOrNull(data.officialInput)
  const officialOutput = toNumberOrNull(data.officialOutput)
  const officialCacheRead = toNumberOrNull(data.officialCacheRead)
  const officialCacheWrite = toNumberOrNull(data.officialCacheWrite)
  const saleMul = toNumberOrNull(data.saleMultiplier)
  const costMul = toNumberOrNull(data.costMultiplier)
  const result: Partial<ModelRatioData> = {}

  if (officialInput === null || officialInput <= 0) return result

  result.ratio = formatPricingNumber((officialInput * (saleMul ?? 1)) / 2)
  if (officialOutput !== null) {
    result.completionRatio = formatPricingNumber(officialOutput / officialInput)
  }
  if (officialCacheRead !== null) {
    result.cacheRatio = formatPricingNumber(officialCacheRead / officialInput)
  }
  if (officialCacheWrite !== null) {
    result.createCacheRatio = formatPricingNumber(
      officialCacheWrite / officialInput
    )
  }
  if (costMul !== null) {
    result.costInput = formatPricingNumber(officialInput * costMul)
    if (officialOutput !== null) {
      result.costOutput = formatPricingNumber(officialOutput * costMul)
    }
    if (officialCacheRead !== null) {
      result.costCache = formatPricingNumber(officialCacheRead * costMul)
    }
  }
  return result
}

// 从 ModelRatioData 还原 multiplier 编辑态。优先从 officialInput 等精确还原;
// 老数据(无 officialInput)从 ratio 近似反推(saleMul≈1), 标 isApproximate。
export function createInitialMultiplierState(
  data?: ModelRatioData | null
): MultiplierLaneState {
  const empty = { input: '', output: '', cacheRead: '', cacheWrite: '' }
  if (!data) {
    return {
      officialPrices: empty,
      saleMultiplier: '',
      costMultiplier: '',
      isApproximate: false,
    }
  }

  if (hasValue(data.officialInput)) {
    return {
      officialPrices: {
        input: data.officialInput || '',
        output: data.officialOutput || '',
        cacheRead: data.officialCacheRead || '',
        cacheWrite: data.officialCacheWrite || '',
      },
      saleMultiplier: data.saleMultiplier || '',
      costMultiplier: data.costMultiplier || '',
      isApproximate: false,
    }
  }

  const ratioNum = toNumberOrNull(data.ratio)
  if (ratioNum === null || ratioNum <= 0) {
    return {
      officialPrices: empty,
      saleMultiplier: '',
      costMultiplier: '',
      isApproximate: false,
    }
  }
  const officialInput = ratioNum * 2
  const completionRatio = toNumberOrNull(data.completionRatio)
  const cacheRatio = toNumberOrNull(data.cacheRatio)
  const createCacheRatio = toNumberOrNull(data.createCacheRatio)
  const costInputNum = toNumberOrNull(data.costInput)
  return {
    officialPrices: {
      input: formatPricingNumber(officialInput),
      output:
        completionRatio !== null
          ? formatPricingNumber(completionRatio * officialInput)
          : '',
      cacheRead:
        cacheRatio !== null
          ? formatPricingNumber(cacheRatio * officialInput)
          : '',
      cacheWrite:
        createCacheRatio !== null
          ? formatPricingNumber(createCacheRatio * officialInput)
          : '',
    },
    saleMultiplier: '1',
    costMultiplier:
      costInputNum !== null && costInputNum > 0
        ? formatPricingNumber(costInputNum / officialInput)
        : '',
    isApproximate: true,
  }
}

export function buildPreviewRows(
  values: ModelPricingFormValues,
  mode: PricingMode,
  billingExpr: string,
  requestRuleExpr: string,
  promptPrice: string,
  lanePrices: Record<LaneKey, string>,
  laneEnabled: Record<LaneKey, boolean>,
  t: (key: string) => string
): PreviewRow[] {
  // 成本与计费模式无关，所有模式都在预览末尾展示。
  const costRows: PreviewRow[] = [
    {
      key: 'costInput',
      label: t('Input cost'),
      value: values.costInput ? `$${values.costInput}` : t('Empty'),
    },
    {
      key: 'costOutput',
      label: t('Output cost'),
      value: values.costOutput ? `$${values.costOutput}` : t('Empty'),
    },
    {
      key: 'costCache',
      label: t('Cache cost'),
      value: values.costCache ? `$${values.costCache}` : t('Empty'),
    },
  ]

  if (mode === 'multiplier') {
    const officialInput = toNumberOrNull(values.officialInput)
    const officialOutput = toNumberOrNull(values.officialOutput)
    const officialCacheRead = toNumberOrNull(values.officialCacheRead)
    const officialCacheWrite = toNumberOrNull(values.officialCacheWrite)
    const saleMul = toNumberOrNull(values.saleMultiplier)
    const costMul = toNumberOrNull(values.costMultiplier)
    const mul = (n: number | null) =>
      n !== null ? `$${formatPricingNumber(n)}` : t('Empty')
    return [
      {
        key: 'officialInput',
        label: t('Official input price'),
        value: mul(officialInput),
      },
      {
        key: 'officialOutput',
        label: t('Official output price'),
        value: mul(officialOutput),
      },
      {
        key: 'officialCacheRead',
        label: t('Official cache read'),
        value: mul(officialCacheRead),
      },
      {
        key: 'officialCacheWrite',
        label: t('Official cache write'),
        value: mul(officialCacheWrite),
      },
      {
        key: 'saleMul',
        label: t('Sale multiplier'),
        value:
          saleMul !== null ? `×${formatPricingNumber(saleMul)}` : t('Empty'),
      },
      {
        key: 'costMul',
        label: t('Cost multiplier'),
        value:
          costMul !== null ? `×${formatPricingNumber(costMul)}` : t('Empty'),
      },
      ...(officialInput !== null && saleMul !== null
        ? [
            {
              key: 'saleInput',
              label: t('Sale input'),
              value: `$${formatPricingNumber(officialInput * saleMul)}`,
            },
          ]
        : []),
      ...(officialInput !== null && costMul !== null
        ? [
            {
              key: 'costInputMul',
              label: t('Cost input'),
              value: `$${formatPricingNumber(officialInput * costMul)}`,
            },
          ]
        : []),
    ]
  }

  if (mode === 'tiered_expr') {
    const effectiveExpr = combineBillingExpr(billingExpr, requestRuleExpr)
    return [
      { key: 'mode', label: 'BillingMode', value: 'tiered_expr' },
      {
        key: 'expr',
        label: t('Expression'),
        value: effectiveExpr || t('Empty'),
        multiline: true,
      },
      ...costRows,
    ]
  }

  if (mode === 'per-request') {
    return [
      {
        key: 'price',
        label: 'ModelPrice',
        value: values.price || t('Empty'),
      },
      ...costRows,
    ]
  }

  return [
    {
      key: 'inputPrice',
      label: t('Input price'),
      value: promptPrice ? `$${promptPrice}` : t('Empty'),
    },
    {
      key: 'completion',
      label: t('Completion price'),
      value:
        laneEnabled.completion && lanePrices.completion
          ? `$${lanePrices.completion}`
          : t('Empty'),
    },
    {
      key: 'cache',
      label: t('Cache read price'),
      value:
        laneEnabled.cache && lanePrices.cache
          ? `$${lanePrices.cache}`
          : t('Empty'),
    },
    {
      key: 'createCache',
      label: t('Cache write price'),
      value:
        laneEnabled.createCache && lanePrices.createCache
          ? `$${lanePrices.createCache}`
          : t('Empty'),
    },
    {
      key: 'image',
      label: t('Image input price'),
      value:
        laneEnabled.image && lanePrices.image
          ? `$${lanePrices.image}`
          : t('Empty'),
    },
    {
      key: 'audio',
      label: t('Audio input price'),
      value:
        laneEnabled.audioInput && lanePrices.audioInput
          ? `$${lanePrices.audioInput}`
          : t('Empty'),
    },
    {
      key: 'audioCompletion',
      label: t('Audio output price'),
      value:
        laneEnabled.audioOutput && lanePrices.audioOutput
          ? `$${lanePrices.audioOutput}`
          : t('Empty'),
    },
    ...costRows,
  ]
}
