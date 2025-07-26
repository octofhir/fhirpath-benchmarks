import type { ImplementationMetadata } from './types'

// Color palette generation for implementations
export const CHART_COLORS = [
  'blue.6',
  'green.6',
  'orange.6',
  'purple.6',
  'red.6',
  'yellow.6',
  'teal.6',
  'pink.6',
  'indigo.6',
  'cyan.6',
  'lime.6',
  'grape.6',
] as const

export function generateColorPalette(count: number): string[] {
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    colors.push(CHART_COLORS[i % CHART_COLORS.length])
  }
  return colors
}

// Time series data formatting
export interface TimeSeriesDataPoint {
  timestamp: number
  date: string
  value: number
  label?: string
}

export function formatTimeSeriesData(
  data: Array<{ timestamp: number; value: number }>,
  dateFormat: 'short' | 'long' = 'short',
): TimeSeriesDataPoint[] {
  return data.map((point) => ({
    ...point,
    date: new Date(point.timestamp).toLocaleDateString(undefined, {
      year: dateFormat === 'long' ? 'numeric' : '2-digit',
      month: dateFormat === 'long' ? 'long' : 'short',
      day: 'numeric',
    }),
  }))
}

// Statistical aggregation functions
export interface StatisticalSummary {
  mean: number
  median: number
  min: number
  max: number
  stdDev: number
  percentile95: number
  percentile99: number
}

export function calculateStatistics(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      percentile95: 0,
      percentile99: 0,
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const n = values.length

  const mean = values.reduce((sum, val) => sum + val, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]

  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  const percentile95 = sorted[Math.floor(n * 0.95)]
  const percentile99 = sorted[Math.floor(n * 0.99)]

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[n - 1],
    stdDev,
    percentile95,
    percentile99,
  }
}

// Data normalization for comparison charts
export function normalizeData<T extends Record<string, any>>(
  data: T[],
  key: keyof T,
  method: 'minMax' | 'zScore' | 'percentage' = 'minMax',
): T[] {
  const values = data.map((item) => Number(item[key]))

  if (values.length === 0) return data

  switch (method) {
    case 'minMax': {
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min

      if (range === 0) return data

      return data.map((item) => ({
        ...item,
        [`${String(key)}_normalized`]: ((Number(item[key]) - min) / range) * 100,
      }))
    }

    case 'zScore': {
      const stats = calculateStatistics(values)
      if (stats.stdDev === 0) return data

      return data.map((item) => ({
        ...item,
        [`${String(key)}_normalized`]: (Number(item[key]) - stats.mean) / stats.stdDev,
      }))
    }

    case 'percentage': {
      const total = values.reduce((sum, val) => sum + val, 0)
      if (total === 0) return data

      return data.map((item) => ({
        ...item,
        [`${String(key)}_normalized`]: (Number(item[key]) / total) * 100,
      }))
    }

    default:
      return data
  }
}

// Transform implementation data for various chart types
export function transformForBarChart(
  implementations: ImplementationMetadata[],
  metric: keyof ImplementationMetadata,
  label?: string,
) {
  return implementations.map((impl, index) => ({
    implementation: impl.name,
    value: impl[metric],
    color: CHART_COLORS[index % CHART_COLORS.length],
    label: label || String(metric),
  }))
}

export function transformForPieChart(
  implementations: ImplementationMetadata[],
  metric: keyof ImplementationMetadata,
) {
  return implementations.map((impl, index) => ({
    name: impl.name,
    value: Number(impl[metric]) || 0,
    color: `var(--mantine-color-${CHART_COLORS[index % CHART_COLORS.length]})`,
  }))
}

export function transformForLineChart(
  data: Array<{ timestamp: number; [key: string]: any }>,
  implementations: string[],
) {
  return data.map((point) => {
    const transformed: any = {
      timestamp: point.timestamp,
      date: new Date(point.timestamp).toLocaleDateString(),
    }

    implementations.forEach((impl) => {
      if (point[impl] !== undefined) {
        transformed[impl] = point[impl]
      }
    })

    return transformed
  })
}

// Chart data validation
export function validateChartData(data: any[]): boolean {
  return Array.isArray(data) && data.length > 0 && data.every((item) => typeof item === 'object')
}

// Performance metric formatters
export function formatExecutionTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatMemoryUsage(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

export function formatPercentage(value: number, precision = 1): string {
  return `${value.toFixed(precision)}%`
}
