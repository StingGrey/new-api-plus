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
import { api } from '@/lib/api'
import type {
  ApiResponse,
  RequestWithdrawPayload,
  Withdraw,
  WithdrawActionPayload,
  WithdrawListResponse,
} from './types'

// User-facing: submit a withdrawal request (principal=1 or dividend=2).
export async function requestWithdraw(
  payload: RequestWithdrawPayload
): Promise<ApiResponse<Withdraw>> {
  const res = await api.post('/api/user/withdraw', payload)
  return res.data
}

// User-facing: list own withdrawal history.
export async function getUserWithdraws(
  page = 1,
  page_size = 20
): Promise<ApiResponse<WithdrawListResponse>> {
  const res = await api.get(
    `/api/user/withdraw/self?page=${page}&page_size=${page_size}`
  )
  return res.data
}

// Root-only: review queue. status=-1 means all statuses.
export async function getAllWithdraws(
  params: {
    page?: number
    page_size?: number
    status?: number
  } = {}
): Promise<ApiResponse<WithdrawListResponse>> {
  const { page = 1, page_size = 20, status = -1 } = params
  const res = await api.get(
    `/api/withdraw/?page=${page}&page_size=${page_size}&status=${status}`
  )
  return res.data
}

// Root-only: approve a pending withdrawal (funds already paid offline → clear frozen).
export async function approveWithdraw(
  payload: WithdrawActionPayload
): Promise<ApiResponse> {
  const res = await api.post('/api/withdraw/approve', payload)
  return res.data
}

// Root-only: reject a pending withdrawal (refund frozen to available balance).
export async function rejectWithdraw(
  payload: WithdrawActionPayload
): Promise<ApiResponse> {
  const res = await api.post('/api/withdraw/reject', payload)
  return res.data
}
