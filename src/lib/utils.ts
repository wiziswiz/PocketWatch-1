import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatCurrency(
  amount: number | string,
  currency = "USD",
  decimals = 2
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (!isFinite(num)) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatNumber(num: number | string, decimals = 2): string {
  const value = typeof num === "string" ? parseFloat(num) : num
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatRelativeTime(iso: string): string {
  const ago = Date.now() - new Date(iso).getTime()
  if (ago < 60_000) return "just now"
  if (ago < 3_600_000) return `${Math.floor(ago / 60_000)}m ago`
  if (ago < 86_400_000) return `${Math.floor(ago / 3_600_000)}h ago`
  return `${Math.floor(ago / 86_400_000)}d ago`
}
