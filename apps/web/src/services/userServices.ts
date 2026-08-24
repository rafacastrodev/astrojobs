import type { components } from '@/types/api'
import { api } from '@/utils/api/client'
import { hashPassword } from '@/utils/crypto/password'
import { env } from '@/utils/env/config'
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
} from '@/utils/validation/authSchemas'

type User = components['schemas']['UserResponse']

export function needsOnboarding(
  user: Pick<User, 'role' | 'onboarding_status'>,
) {
  return user.role === 'professional' && user.onboarding_status === 'pending'
}

export function postAuthPath(user: Pick<User, 'role' | 'onboarding_status'>) {
  if (user.role === 'recruiter') return '/recruiter' as const
  if (needsOnboarding(user)) return '/onboarding' as const
  return '/dashboard' as const
}

export function userPhotoUrl(user: Pick<User, 'photo_url'> | null | undefined) {
  if (!user?.photo_url) return null
  const base = env.API_URL.replace(/\/$/, '')
  return `${base}${user.photo_url}`
}

async function signIn(values: LoginFormValues) {
  const response = await api.post<User>('/auth/login', {
    email: values.email,
    password: await hashPassword(values.password),
  })
  return response.data
}

async function signUp({
  confirmPassword: _confirmPassword,
  password,
  ...body
}: SignupFormValues) {
  const response = await api.post<User>('/auth/signup', {
    username: body.username,
    email: body.email,
    role: body.role,
    password: await hashPassword(password),
  })
  return response.data
}

async function signOut() {
  const response = await api.post<{ ok: boolean }>('/auth/logout')
  return response.data
}

async function getCurrentUser() {
  try {
    const response = await api.get<User>('/auth/me')
    return response.data
  } catch {
    return null
  }
}

async function forgotPassword(values: ForgotPasswordFormValues) {
  const response = await api.post<{ ok: boolean }>(
    '/auth/forgot-password',
    values,
  )
  return response.data
}

async function resetPassword(token: string, values: ResetPasswordFormValues) {
  const response = await api.post<{ ok: boolean }>('/auth/reset-password', {
    token,
    new_password: await hashPassword(values.password),
  })
  return response.data
}

async function uploadPhoto(file: File) {
  const body = new FormData()
  body.append('file', file)
  const response = await api.post<User>('/auth/me/photo', body)
  return response.data
}

async function updateProfile(body: {
  job_title?: string | null
  region?: string | null
  salary_min_usd?: number | null
  salary_max_usd?: number | null
  onboarding_status?: 'skipped' | 'completed'
}) {
  const response = await api.patch<User>('/auth/me', body)
  return response.data
}

export const userServices = {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  uploadPhoto,
  updateProfile,
}
