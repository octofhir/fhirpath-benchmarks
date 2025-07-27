/**
 * Data fetching utilities for benchmark results
 * Handles loading JSON files from public/test-results directory for GitHub Pages
 * and provides caching mechanism
 */

import type {
  BenchmarkResult,
  ComparisonReport,
  DashboardStats,
  ImplementationMetadata,
  ImplementationsConfig,
  TestResult,
} from '../lib/types'

// Cache for storing fetched data
interface DataCache {
  [key: string]: {
    data: unknown
    timestamp: number
    ttl: number
  }
}

const cache: DataCache = {}
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Generic cache implementation
 */
function getCachedData<T>(key: string): T | null {
  const cached = cache[key]
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T
  }
  return null
}

function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache[key] = {
    data,
    timestamp: Date.now(),
    ttl,
  }
}

/**
 * Get the base path for the application
 */
function getBasePath(): string {
  // In development, base path is '/', in production it's '/fhirpath-benchmarks/'
  return import.meta.env.BASE_URL || '/'
}

/**
 * Construct a URL with the proper base path
 */
function buildUrl(path: string): string {
  const basePath = getBasePath()
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${basePath}${cleanPath}`
}

/**
 * Fetch JSON data with error handling and validation
 */
async function fetchJson<T>(url: string): Promise<T> {
  const fullUrl = buildUrl(url)
  try {
    const response = await fetch(fullUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch data from ${fullUrl}:`, error)
    throw new Error(
      `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Load the latest comparison report
 */
export async function loadLatestComparisonReport(): Promise<ComparisonReport> {
  const cacheKey = 'latest-comparison-report'
  const cached = getCachedData<ComparisonReport>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // In production, this would be a dynamic endpoint
    // For now, we'll use a static file approach
    const data = await fetchJson<ComparisonReport>('test-results/latest/comparison_report.json')
    setCachedData(cacheKey, data)
    return data
  } catch (_error) {
    // Fallback to mock data for development
    console.warn('Using mock data for comparison report')
    const mockData = createMockComparisonReport()
    setCachedData(cacheKey, mockData, 1000) // Short TTL for mock data
    return mockData
  }
}

/**
 * Load test results for a specific implementation
 */
export async function loadTestResults(implementation: string): Promise<TestResult> {
  const cacheKey = `test-results-${implementation}`
  const cached = getCachedData<TestResult>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const data = await fetchJson<TestResult>(
      `test-results/latest/${implementation}_test_results.json`,
    )
    setCachedData(cacheKey, data)
    return data
  } catch (_error) {
    console.warn(`Using mock data for test results: ${implementation}`)
    const mockData = createMockTestResult(implementation)
    setCachedData(cacheKey, mockData, 1000)
    return mockData
  }
}

/**
 * Load benchmark results for a specific implementation
 */
export async function loadBenchmarkResults(implementation: string): Promise<BenchmarkResult> {
  const cacheKey = `benchmark-results-${implementation}`
  const cached = getCachedData<BenchmarkResult>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const data = await fetchJson<BenchmarkResult>(
      `test-results/latest/${implementation}_benchmark_results.json`,
    )
    setCachedData(cacheKey, data)
    return data
  } catch (_error) {
    console.warn(`Using mock data for benchmark results: ${implementation}`)
    const mockData = createMockBenchmarkResult(implementation)
    setCachedData(cacheKey, mockData, 1000)
    return mockData
  }
}

/**
 * Load all available implementations metadata
 */
export async function loadImplementationsMetadata(): Promise<ImplementationMetadata[]> {
  const cacheKey = 'implementations-metadata'
  const cached = getCachedData<ImplementationMetadata[]>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const data = await fetchJson<ImplementationMetadata[]>('test-results/implementations.json')
    setCachedData(cacheKey, data)
    return data
  } catch (_error) {
    console.warn('Using mock data for implementations metadata')
    const mockData = createMockImplementationsMetadata()
    setCachedData(cacheKey, mockData, 1000)
    return mockData
  }
}

/**
 * Load implementations configuration data
 */
export async function loadImplementations(): Promise<ImplementationsConfig> {
  const cacheKey = 'implementations-config'
  const cached = getCachedData<ImplementationsConfig>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const data = await fetchJson<ImplementationsConfig>('implementations.json')
    setCachedData(cacheKey, data)
    return data
  } catch (_error) {
    console.warn('Using mock data for implementations config')
    const mockData = createMockImplementationsConfig()
    setCachedData(cacheKey, mockData, 1000)
    return mockData
  }
}

/**
 * Calculate dashboard statistics from comparison report
 */
export function calculateDashboardStats(report: ComparisonReport): DashboardStats {
  const implementations = report.test_results.length
  const totalTests = report.summary.total_tests
  const totalPassed = report.test_results.reduce((sum, result) => sum + result.summary.passed, 0)
  const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0

  return {
    total_implementations: implementations,
    total_test_cases: totalTests,
    overall_pass_rate: overallPassRate,
    fastest_implementation: report.summary.fastest_implementation || 'N/A',
    most_compliant_implementation: report.summary.most_compliant_implementation || 'N/A',
    last_benchmark_run: report.timestamp,
  }
}

/**
 * Clear cache (useful for force refresh)
 */
export function clearCache(): void {
  Object.keys(cache).forEach((key) => delete cache[key])
}

// Mock data generators for development
function createMockComparisonReport(): ComparisonReport {
  return {
    id: 'mock-report-1',
    timestamp: new Date().toISOString(),
    test_results: [
      createMockTestResult('javascript'),
      createMockTestResult('python'),
      createMockTestResult('java'),
    ],
    benchmark_results: [
      createMockBenchmarkResult('javascript'),
      createMockBenchmarkResult('python'),
      createMockBenchmarkResult('java'),
    ],
    summary: {
      languages_tested: 3,
      total_tests: 150,
      total_benchmarks: 45,
      fastest_implementation: 'javascript',
      most_compliant_implementation: 'java',
    },
    metadata: {
      runner_version: '0.1.0',
      format_version: '2.0',
      environment: {},
      command_line: [],
    },
  }
}

function createMockTestResult(language: string): TestResult {
  const total = 50
  const passed = Math.floor(total * (0.85 + Math.random() * 0.1))
  const failed = total - passed

  return {
    id: `mock-test-${language}`,
    language,
    timestamp: new Date().toISOString(),
    execution_time_ms: 1000 + Math.random() * 5000,
    timing: {
      setup_time_ms: 100,
      execution_time_ms: 900,
      teardown_time_ms: 50,
      total_time_ms: 1050,
    },
    system_info: {
      os: 'Linux',
      arch: 'x86_64',
      cpu_count: 8,
      total_memory: 16000000000,
      available_memory: 8000000000,
    },
    tests: [],
    summary: {
      total,
      passed,
      failed,
      errors: 0,
      execution_time_ms: 1000,
    },
    metadata: {
      runner_version: '0.1.0',
      format_version: '2.0',
      environment: {},
      command_line: [],
    },
  }
}

function createMockBenchmarkResult(language: string): BenchmarkResult {
  return {
    id: `mock-benchmark-${language}`,
    language,
    timestamp: new Date().toISOString(),
    timing: {
      setup_time_ms: 200,
      execution_time_ms: 5000,
      teardown_time_ms: 100,
      total_time_ms: 5300,
    },
    system_info: {
      os: 'Linux',
      arch: 'x86_64',
      cpu_count: 8,
      total_memory: 16000000000,
      available_memory: 8000000000,
    },
    benchmarks: [],
    summary: {
      total_cases: 15,
      total_iterations: 150,
      total_time_ms: 5000,
      avg_time_per_case_ms: 33.33,
    },
    metadata: {
      runner_version: '0.1.0',
      format_version: '2.0',
      environment: {},
      command_line: [],
    },
  }
}

function createMockImplementationsMetadata(): ImplementationMetadata[] {
  const languages = ['javascript', 'python', 'java', 'csharp', 'rust', 'go']

  return languages.map((lang) => ({
    name: lang.charAt(0).toUpperCase() + lang.slice(1),
    language: lang,
    pass_rate: 85 + Math.random() * 10,
    avg_execution_time: 10 + Math.random() * 50,
    total_tests: 50,
    passed_tests: Math.floor(50 * (0.85 + Math.random() * 0.1)),
    failed_tests: Math.floor(50 * (0.05 + Math.random() * 0.1)),
    error_count: Math.floor(Math.random() * 3),
    last_updated: new Date().toISOString(),
  }))
}

function createMockImplementationsConfig(): ImplementationsConfig {
  return {
    implementations: [
      {
        id: 'javascript',
        name: 'JavaScript',
        language: 'JavaScript',
        description: 'FHIRPath implementation using Node.js JavaScript runtime',
        version: '1.0.0',
        buildSystem: 'npm',
        runtime: 'Node.js',
        maintainer: 'OctoFHIR Team',
        repository: 'https://github.com/octofhir/fhirpath-benchmarks',
        documentation:
          'https://github.com/octofhir/fhirpath-benchmarks/tree/main/implementations/javascript',
        features: ['Dynamic typing', 'Event-driven', 'Large ecosystem', 'Web-native'],
        dependencies: ['fhirpath', 'fs', 'path'],
        status: 'active',
        lastUpdated: '2025-07-26',
        performance: {
          category: 'medium',
          strengths: ['Fast development', 'JSON native', 'Large community'],
          considerations: ['Single-threaded', 'Dynamic typing overhead', 'Memory usage'],
        },
      },
      {
        id: 'python',
        name: 'Python',
        language: 'Python',
        description: 'FHIRPath implementation using Python programming language',
        version: '1.0.0',
        buildSystem: 'pip',
        runtime: 'CPython',
        maintainer: 'OctoFHIR Team',
        repository: 'https://github.com/octofhir/fhirpath-benchmarks',
        documentation:
          'https://github.com/octofhir/fhirpath-benchmarks/tree/main/implementations/python',
        features: [
          'Readable syntax',
          'Rich data science ecosystem',
          'Rapid prototyping',
          'Cross-platform',
        ],
        dependencies: ['fhirpathpy', 'json', 'sys'],
        status: 'active',
        lastUpdated: '2025-07-26',
        performance: {
          category: 'medium',
          strengths: ['Development speed', 'Library ecosystem', 'Readability'],
          considerations: ['Interpreted performance', 'GIL limitations', 'Memory usage'],
        },
      },
      {
        id: 'java',
        name: 'Java',
        language: 'Java',
        description: 'FHIRPath implementation using Java and Maven build system',
        version: '1.0.0',
        buildSystem: 'Maven',
        runtime: 'JVM',
        maintainer: 'OctoFHIR Team',
        repository: 'https://github.com/octofhir/fhirpath-benchmarks',
        documentation:
          'https://github.com/octofhir/fhirpath-benchmarks/tree/main/implementations/java',
        features: ['Enterprise-grade', 'Rich ecosystem', 'Platform independence', 'Strong tooling'],
        dependencies: [
          'ca.uhn.hapi.fhir:hapi-fhir-structures-r4',
          'ca.uhn.hapi.fhir:hapi-fhir-validation',
        ],
        status: 'active',
        lastUpdated: '2025-07-26',
        performance: {
          category: 'high',
          strengths: ['JVM optimizations', 'Mature ecosystem', 'Scalability'],
          considerations: ['JVM startup time', 'Memory usage', 'Verbosity'],
        },
      },
    ],
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalImplementations: 3,
      categories: {
        high: ['java'],
        medium: ['javascript', 'python'],
      },
      runtimes: {
        JVM: ['java'],
        'Node.js': ['javascript'],
        CPython: ['python'],
      },
    },
  }
}
