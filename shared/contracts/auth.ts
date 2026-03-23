export type UserRole = "student" | "viewer" | "employer"

export type RegisterRequest = {
  email: string
  password: string
  role: UserRole
  display_name: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  email: string
  display_name: string
  role: UserRole
}

export type LoginResponse = {
  access_token: string
  token_type: "bearer"
  expires_in_seconds: number
  user: AuthUser
}

