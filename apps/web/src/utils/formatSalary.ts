export const formatUsdSalary = (min: unknown, max: unknown): string | null => {
  const toNumber = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null
  const low = toNumber(min)
  const high = toNumber(max)
  if (low == null && high == null) return null
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  if (low != null && high != null && low !== high) {
    return `${format(low)} – ${format(high)}`
  }
  return format((low ?? high) as number)
}
