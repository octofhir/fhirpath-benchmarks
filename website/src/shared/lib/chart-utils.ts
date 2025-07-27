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

// Advanced Statistical Analysis Tools

export interface ConfidenceInterval {
  lower: number
  upper: number
  confidence: number
}

export function calculateConfidenceInterval(
  values: number[],
  confidence: number = 0.95,
): ConfidenceInterval {
  if (values.length === 0) {
    return { lower: 0, upper: 0, confidence }
  }

  const stats = calculateStatistics(values)
  const n = values.length
  const tValue = getTValue(confidence, n - 1)
  const standardError = stats.stdDev / Math.sqrt(n)
  const margin = tValue * standardError

  return {
    lower: stats.mean - margin,
    upper: stats.mean + margin,
    confidence,
  }
}

function getTValue(confidence: number, degreesOfFreedom: number): number {
  // Simplified t-value lookup for common confidence levels
  const tTable: Record<number, Record<number, number>> = {
    0.95: { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 10: 2.228, 20: 2.086, 30: 2.042 },
    0.99: { 1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032, 10: 3.169, 20: 2.845, 30: 2.75 },
  }

  const table = tTable[confidence]
  if (!table) return 1.96 // Default to z-value for 95% confidence

  // Find closest degrees of freedom
  const availableDf = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)
  const closestDf = availableDf.reduce((prev, curr) =>
    Math.abs(curr - degreesOfFreedom) < Math.abs(prev - degreesOfFreedom) ? curr : prev,
  )

  return table[closestDf] || 1.96
}

export function detectOutliers(values: number[], method: 'iqr' | 'zscore' = 'iqr'): number[] {
  if (values.length === 0) return []

  if (method === 'iqr') {
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length
    const q1 = sorted[Math.floor(n * 0.25)]
    const q3 = sorted[Math.floor(n * 0.75)]
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    return values.filter((value) => value < lowerBound || value > upperBound)
  } else {
    const stats = calculateStatistics(values)
    const threshold = 2.5 // Standard deviations
    return values.filter((value) => Math.abs(value - stats.mean) / stats.stdDev > threshold)
  }
}

export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0

  const n = x.length
  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n

  let numerator = 0
  let sumXSquared = 0
  let sumYSquared = 0

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - meanX
    const yDiff = y[i] - meanY
    numerator += xDiff * yDiff
    sumXSquared += xDiff * xDiff
    sumYSquared += yDiff * yDiff
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared)
  return denominator === 0 ? 0 : numerator / denominator
}

export function performTTest(
  sample1: number[],
  sample2: number[],
): {
  tStatistic: number
  pValue: number
  significant: boolean
} {
  if (sample1.length === 0 || sample2.length === 0) {
    return { tStatistic: 0, pValue: 1, significant: false }
  }

  const stats1 = calculateStatistics(sample1)
  const stats2 = calculateStatistics(sample2)

  const n1 = sample1.length
  const n2 = sample2.length

  const pooledStdDev = Math.sqrt(
    ((n1 - 1) * stats1.stdDev * stats1.stdDev + (n2 - 1) * stats2.stdDev * stats2.stdDev) /
      (n1 + n2 - 2),
  )

  const standardError = pooledStdDev * Math.sqrt(1 / n1 + 1 / n2)
  const tStatistic = (stats1.mean - stats2.mean) / standardError

  // Simplified p-value approximation
  const pValue = Math.abs(tStatistic) > 2 ? 0.05 : 0.1

  return {
    tStatistic,
    pValue,
    significant: pValue < 0.05,
  }
}

// Chart Export Functionality
export interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json' | 'csv'
  filename?: string
  width?: number
  height?: number
  quality?: number
}

export function exportChartData(data: any[], options: ChartExportOptions): void {
  const { format, filename = 'chart-data' } = options

  switch (format) {
    case 'json':
      downloadJSON(data, filename)
      break
    case 'csv':
      downloadCSV(data, filename)
      break
    default:
      console.warn(`Export format ${format} not implemented for data export`)
  }
}

function downloadJSON(data: any[], filename: string): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  downloadBlob(blob, `${filename}.json`)
}

function downloadCSV(data: any[], filename: string): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => (typeof row[header] === 'string' ? `"${row[header]}"` : row[header]))
        .join(','),
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  downloadBlob(blob, `${filename}.csv`)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Shareable Chart URLs
export function generateShareableURL(chartConfig: {
  type: string
  data: any[]
  options: any
}): string {
  const encoded = btoa(JSON.stringify(chartConfig))
  return `${window.location.origin}/charts/shared/${encoded}`
}

// Mobile Optimization Utilities
export function getResponsiveChartSize(screenWidth: number): { width: number; height: number } {
  if (screenWidth < 768) {
    return { width: screenWidth - 32, height: 250 }
  } else if (screenWidth < 1024) {
    return { width: screenWidth - 64, height: 300 }
  } else {
    return { width: 800, height: 400 }
  }
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
