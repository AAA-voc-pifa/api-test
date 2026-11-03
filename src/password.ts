const PASSWORD_KEY = 'password'

export function readPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function savePassword(password: string) {
  localStorage.setItem(PASSWORD_KEY, password)
}
