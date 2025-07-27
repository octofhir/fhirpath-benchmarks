/**
 * Data transformation utilities for converting raw benchmark data
 * to display-friendly formats
 */

import type {
  BenchmarkResult,
  ChartDataPoint,
  ComparisonReport,
  ImplementationMetadata,
  PassRateChartData,
  PerformanceChartData,
  TestResult,
} from './types'

/**
 * Convert test results to implementation metadata for display
 */
export function transformTestResultsToMetadata(
  testResults: TestResult[],
): ImplementationMetadata[] {
  return testResults.map((result) => ({
    name: result.language.charAt(0).toUpperCase() + result.language.slice(1),
    language: result.language,
    pass_rate: result.summary.total > 0 ? (result.summary.passed / result.summary.total) * 100 : 0,
    avg_execution_time: result.summary.execution_time_ms / (result.summary.total || 1),
    total_tests: result.summary.total,
    passed_tests: result.summary.passed,
    failed_tests: result.summary.failed,
    error_count: result.summary.errors,
    last_updated: result.timestamp,
  }))
}

/**
 * Calculate derived performance metrics
 */
export function calculatePerformanceMetrics(
  benchmarkResults: BenchmarkResult[],
): PerformanceChartData[] {
  return benchmarkResults.map((result) => {
    const times = result.benchmarks.flatMap((benchmark) => benchmark.times)
    const sortedTimes = times.sort((a, b) => a - b)

    const p95Index = Math.floor(sortedTimes.length * 0.95)
    const p99Index = Math.floor(sortedTimes.length * 0.99)

    return {
      implementation: result.language,
      avg_time: result.summary.avg_time_per_case_ms,
      median_time: sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : 0,
      p95_time: sortedTimes[p95Index] || 0,
      p99_time: sortedTimes[p99Index] || 0,
    }
  })
}

/**
 * Transform test results to pass rate chart data
 */
export function transformToPassRateChartData(testResults: TestResult[]): PassRateChartData[] {
  return testResults.map((result) => ({
    implementation: result.language,
    pass_rate: result.summary.total > 0 ? (result.summary.passed / result.summary.total) * 100 : 0,
    passed: result.summary.passed,
    total: result.summary.total,
  }))
}

/**
 * Create chart data points for various visualizations
 */
export function createChartDataPoints(
  data: Array<{ label: string; value: number }>,
  colorPalette?: string[],
): ChartDataPoint[] {
  const defaultColors = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
  ]

  return data.map((item, index) => ({
    label: item.label,
    value: item.value,
    color: colorPalette?.[index] || defaultColors[index % defaultColors.length],
  }))
}

/**
 * Calculate performance ratio relative to fastest implementation
 */
export function calculatePerformanceRatios(performanceData: PerformanceChartData[]): Array<{
  implementation: string
  ratio: number
  fastest: boolean
}> {
  const fastestTime = Math.min(...performanceData.map((d) => d.avg_time))

  return performanceData.map((data) => ({
    implementation: data.implementation,
    ratio: data.avg_time / fastestTime,
    fastest: data.avg_time === fastestTime,
  }))
}

/**
 * Group test cases by category or complexity
 */
export function groupTestCasesByCategory(testResults: TestResult[]): Record<
  string,
  {
    total: number
    passed: number
    failed: number
    pass_rate: number
  }
> {
  const categoryStats: Record<string, { total: number; passed: number; failed: number }> = {}

  testResults.forEach((result) => {
    result.tests.forEach((test) => {
      // Extract category from test file or metadata
      const category = extractCategoryFromTestName(test.file) || 'Other'

      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, passed: 0, failed: 0 }
      }

      categoryStats[category].total++
      if (test.passed) {
        categoryStats[category].passed++
      } else {
        categoryStats[category].failed++
      }
    })
  })

  // Calculate pass rates
  return Object.entries(categoryStats).reduce(
    (acc, [category, stats]) => {
      acc[category] = {
        ...stats,
        pass_rate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0,
      }
      return acc
    },
    {} as Record<string, { total: number; passed: number; failed: number; pass_rate: number }>,
  )
}

/**
 * Extract category from test file name or metadata
 */
function extractCategoryFromTestName(fileName: string): string {
  // Map of common test file patterns to categories
  const categoryMap: Record<string, string> = {
    arithmetic: 'Arithmetic Operations',
    logic: 'Logical Operations',
    string: 'String Operations',
    date: 'Date/Time Operations',
    collection: 'Collection Operations',
    navigation: 'Path Navigation',
    function: 'Function Calls',
    literal: 'Literals',
    type: 'Type Operations',
    comparison: 'Comparison Operations',
  }

  const fileName_lower = fileName.toLowerCase()

  for (const [pattern, category] of Object.entries(categoryMap)) {
    if (fileName_lower.includes(pattern)) {
      return category
    }
  }

  return 'Other'
}

/**
 * Calculate trend data for historical comparison
 */
export function calculateTrendData(
  historical: ComparisonReport[],
  implementation: string,
): Array<{
  timestamp: string
  pass_rate: number
  avg_execution_time: number
}> {
  return historical
    .map((report) => {
      const testResult = report.test_results.find((r) => r.language === implementation)
      if (!testResult) return null

      return {
        timestamp: report.timestamp,
        pass_rate:
          testResult.summary.total > 0
            ? (testResult.summary.passed / testResult.summary.total) * 100
            : 0,
        avg_execution_time: testResult.summary.execution_time_ms / (testResult.summary.total || 1),
      }
    })
    .filter(Boolean)
    .sort(
      (a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime(),
    ) as Array<{
    timestamp: string
    pass_rate: number
    avg_execution_time: number
  }>
}

/**
 * Sort implementations by specified criteria
 */
export function sortImplementations(
  implementations: ImplementationMetadata[],
  sortBy: 'name' | 'pass_rate' | 'avg_execution_time' | 'last_updated',
  direction: 'asc' | 'desc' = 'desc',
): ImplementationMetadata[] {
  return [...implementations].sort((a, b) => {
    let aVal: number | string
    let bVal: number | string

    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'pass_rate':
        aVal = a.pass_rate
        bVal = b.pass_rate
        break
      case 'avg_execution_time':
        aVal = a.avg_execution_time
        bVal = b.avg_execution_time
        break
      case 'last_updated':
        aVal = new Date(a.last_updated).getTime()
        bVal = new Date(b.last_updated).getTime()
        break
      default:
        return 0
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    return direction === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  })
}

/**
 * Filter implementations based on criteria
 */
export function filterImplementations(
  implementations: ImplementationMetadata[],
  filters: {
    search?: string
    languages?: string[]
    minPassRate?: number
    maxExecutionTime?: number
  },
): ImplementationMetadata[] {
  return implementations.filter((impl) => {
    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (
        !impl.name.toLowerCase().includes(searchLower) &&
        !impl.language.toLowerCase().includes(searchLower)
      ) {
        return false
      }
    }

    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      if (!filters.languages.includes(impl.language)) {
        return false
      }
    }

    // Pass rate filter
    if (filters.minPassRate !== undefined && impl.pass_rate < filters.minPassRate) {
      return false
    }

    // Execution time filter
    if (
      filters.maxExecutionTime !== undefined &&
      impl.avg_execution_time > filters.maxExecutionTime
    ) {
      return false
    }

    return true
  })
}
