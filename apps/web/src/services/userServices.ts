import type { components } from '@/types/api'
import { api } from '@/utils/api/client'
import { hashPassword } from '@/utils/crypto/password'
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
} from '@/utils/validation/authSchemas'

type User = components['schemas']['UserResponse']

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
    ...body,
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

export const userServices = {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  forgotPassword,
  resetPassword,
}
