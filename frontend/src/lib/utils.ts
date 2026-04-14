import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number): string {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}
