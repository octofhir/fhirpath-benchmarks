/**
 * TypeScript interfaces for FHIRPath benchmark data
 * Based on the enhanced JSON format from the Rust runner
 */

export interface SystemInfo {
  os: string
  arch: string
  cpu_count: number
  total_memory: number
  available_memory: number
}

export interface ProcessStats {
  cpu_usage: number
  memory_usage: number
  virtual_memory: number
}

export interface ExecutionTiming {
  setup_time_ms: number
  execution_time_ms: number
  teardown_time_ms: number
  total_time_ms: number
}

export interface ResultMetadata {
  runner_version: string
  format_version: string
  environment: Record<string, string>
  command_line: string[]
}

export interface TestCaseResult {
  name: string
  file: string
  passed: boolean
  execution_time_ms: number
  expected: any
  actual?: any
  error?: string
  metadata: Record<string, any>
}

export interface TestSummary {
  total: number
  passed: number
  failed: number
  errors: number
  execution_time_ms: number
}

export interface TestResult {
  id: string
  language: string
  timestamp: string
  execution_time_ms: number
  timing: ExecutionTiming
  system_info: SystemInfo
  process_stats?: ProcessStats
  tests: TestCaseResult[]
  summary: TestSummary
  metadata: ResultMetadata
  error?: string
}

export interface BenchmarkCaseResult {
  name: string
  file: string
  iterations: number
  total_time_ms: number
  avg_time_ms: number
  median_time_ms: number
  min_time_ms: number
  max_time_ms: number
  std_dev_ms: number
  times: number[]
  statistical_summary: {
    mean: number
    median: number
    min: number
    max: number
    stdDev: number
    percentile95: number
    percentile99: number
  }
  memory_stats?: ProcessStats
  warmup_iterations: number
  error?: string
}

export interface BenchmarkSummary {
  total_cases: number
  total_iterations: number
  total_time_ms: number
  avg_time_per_case_ms: number
}

export interface BenchmarkResult {
  id: string
  language: string
  timestamp: string
  timing: ExecutionTiming
  system_info: SystemInfo
  process_stats?: ProcessStats
  benchmarks: BenchmarkCaseResult[]
  summary: BenchmarkSummary
  metadata: ResultMetadata
  error?: string
}

export interface ComparisonSummary {
  languages_tested: number
  total_tests: number
  total_benchmarks: number
  fastest_implementation?: string
  most_compliant_implementation?: string
}

export interface ComparisonReport {
  id: string
  timestamp: string
  test_results: TestResult[]
  benchmark_results: BenchmarkResult[]
  summary: ComparisonSummary
  metadata: ResultMetadata
}

// Display-specific interfaces for the UI
export interface ImplementationMetadata {
  name: string
  language: string
  version?: string
  description?: string
  pass_rate: number
  avg_execution_time: number
  total_tests: number
  passed_tests: number
  failed_tests: number
  error_count: number
  last_updated: string
}

export interface DashboardStats {
  total_implementations: number
  total_test_cases: number
  overall_pass_rate: number
  fastest_implementation: string
  most_compliant_implementation: string
  last_benchmark_run: string
}

export interface TestCase {
  name: string
  description?: string
  expression: string
  expected: any
  tags?: string[]
  category?: string
  complexity?: 'low' | 'medium' | 'high'
  input_file?: string
  disabled?: boolean
}

export interface TestCaseResults {
  test_case: TestCase
  results: Array<{
    implementation: string
    passed: boolean
    execution_time_ms: number
    actual?: any
    error?: string
  }>
}

// Filter and search interfaces
export interface FilterOptions {
  implementations?: string[]
  categories?: string[]
  tags?: string[]
  status?: ('passed' | 'failed' | 'error')[]
  performance_range?: {
    min: number
    max: number
  }
  text_search?: string
}

export interface SortOption {
  field: string
  direction: 'asc' | 'desc'
}

// Chart data interfaces
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface PerformanceChartData {
  implementation: string
  avg_time: number
  median_time: number
  p95_time: number
  p99_time: number
}

export interface PassRateChartData {
  implementation: string
  pass_rate: number
  passed: number
  total: number
}

// Implementation configuration interfaces
export interface ImplementationInfo {
  id: string
  name: string
  language: string
  description: string
  version: string
  buildSystem: string
  runtime: string
  maintainer: string
  library?: string
  repository: string
  documentation: string
  icon?: string
  features: string[]
  dependencies: string[]
  status: 'active' | 'deprecated' | 'experimental'
  lastUpdated: string
  performance: {
    category: 'high' | 'medium' | 'low'
    strengths: string[]
    considerations: string[]
  }
}

export interface ImplementationsConfig {
  implementations: ImplementationInfo[]
  metadata: {
    version: string
    lastUpdated: string
    totalImplementations: number
    categories: {
      high: string[]
      medium: string[]
      low?: string[]
    }
    runtimes: Record<string, string[]>
  }
}
