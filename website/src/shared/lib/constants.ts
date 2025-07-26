export const APP_CONFIG = {
  name: 'FHIRPath Benchmarks',
  version: '1.0.0',
  description: 'Performance comparison of FHIRPath implementations',
} as const

export const BREAKPOINTS = {
  xs: '36em',
  sm: '48em',
  md: '62em',
  lg: '75em',
  xl: '88em',
} as const

export const IMPLEMENTATIONS = [
  'rust',
  'javascript',
  'python',
  'java',
  'csharp',
  'go',
  'clojure',
] as const

export type Implementation = (typeof IMPLEMENTATIONS)[number]
