// Fungsi validasi yang dipakai bersama di frontend dan backend
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

export function isValidIndonesianPhone(phone: string): boolean {
  return /^(\+62|62|0)8[1-9][0-9]{7,10}$/.test(phone)
}
