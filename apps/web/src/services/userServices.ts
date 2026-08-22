import type { components } from '@/types/api'
import { api } from '@/utils/api/client'
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
} from '@/utils/validation/authSchemas'

type User = components['schemas']['UserResponse']

async function signIn(values: LoginFormValues) {
  const response = await api.post<User>('/auth/login', values)
  return response.data
}

async function signUp({
  confirmPassword: _confirmPassword,
  ...body
}: SignupFormValues) {
  const response = await api.post<User>('/auth/signup', body)
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
    new_password: values.password,
  })
  return response.data
}

export const userServices = {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  forgotPassword,
  resetPassword,
}
