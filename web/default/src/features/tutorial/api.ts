import { api } from '@/lib/api'
import type { TutorialResponse } from './types'

export async function getTutorialContent() {
  const res = await api.get<TutorialResponse>('/api/tutorial')
  return res.data
}
