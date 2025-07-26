# ADR-001: FHIRPath Benchmarking Website Development

## Status
Proposed

## Context
The FHIRPath benchmarking project currently has a comprehensive infrastructure for running tests and benchmarks across multiple programming language implementations (Clojure, C#, Go, Java, JavaScript, Python). However, the results are only available as JSON files, making it difficult for users to:

1. **Visualize Performance Data**: Compare performance metrics across different implementations
2. **Analyze Test Results**: Understand which tests pass/fail for each implementation
3. **Access Detailed Benchmarks**: View comprehensive benchmark summaries and detailed metrics
4. **Track Progress**: Monitor improvements and regressions over time

The current Python-based test runner (`run-comparison.py`) generates structured JSON output, but there's no user-friendly interface to consume this data. Additionally, the project aims to highlight the octofhir/fhirpath-rs library as the primary focus while providing comparative analysis with other implementations.

## Decision
We will develop a modern web application to showcase FHIRPath benchmarking results with the following technical stack and architecture:

### Technology Stack
- **Frontend Framework**: React 19 with TypeScript
- **UI Component Library**: Mantine UI Kit 8
- **Data Visualization**: Mantine Charts (built on Recharts)
- **Code Quality**: Biome for linting and formatting
- **Design System**: Linear Design System with modern fluent design principles
- **Build Tool**: Vite for fast development and optimized builds
- **Frontend Architecture**: Feature-Sliced Design (FSD) methodology for scalable code organization

### Architecture Components

#### 1. Frontend Architecture (Feature-Sliced Design)
The website will follow Feature-Sliced Design (FSD) methodology to ensure scalable, maintainable, and team-friendly code organization:

**FSD Layer Structure:**
```
website/
├── app/                    # App layer - initialization, providers, routing
│   ├── providers/         # Global providers (theme, data, etc.)
│   ├── router/           # Application routing configuration
│   └── styles/           # Global styles and theme
├── pages/                 # Pages layer - route components
│   ├── dashboard/        # Dashboard page
│   ├── benchmark-detail/ # Individual benchmark pages
│   ├── test-explorer/    # Test case explorer page
│   └── landing/          # Landing page
├── widgets/              # Widgets layer - composite UI blocks
│   ├── benchmark-table/  # Benchmark comparison table
│   ├── performance-chart/# Performance visualization widget
│   ├── test-results-grid/# Test results matrix
│   └── navigation-header/# Main navigation component
├── features/             # Features layer - business logic slices
│   ├── benchmark-comparison/  # Compare implementations
│   ├── test-filtering/       # Filter and search tests
│   ├── data-export/         # Export functionality
│   └── implementation-analysis/ # Detailed analysis features
├── entities/             # Entities layer - business entities
│   ├── benchmark/        # Benchmark data models and API
│   ├── test-case/        # Test case entities
│   ├── implementation/   # Implementation metadata
│   └── performance-metric/ # Performance data models
└── shared/               # Shared layer - reusable resources
    ├── ui/              # UI kit components (buttons, cards, etc.)
    ├── lib/             # Utility libraries and helpers
    ├── api/             # API client and data fetching
    └── config/          # Configuration and constants
```

**FSD Benefits for this project:**
- **Feature Isolation**: Each benchmark feature is self-contained
- **Scalability**: Easy to add new implementations or metrics
- **Team Collaboration**: Clear boundaries for parallel development
- **Maintainability**: Predictable code organization and dependencies
- **Reusability**: Shared components across different features

#### 2. Test Runner Migration
- **Replace Python Runner**: Rewrite `run-comparison.py` in Rust for better performance and consistency
- **Enhanced JSON Output**: Improve result format to include timing data, memory usage, and detailed error information
- **Standardized Test Cases**: Ensure all runners consume the existing JSON test cases from `specs/fhirpath/tests`

#### 3. Website Structure
- **Landing Page**: Overview of FHIRPath implementations with focus on fhirpath-rs
- **Results Dashboard**: Interactive tables showing test pass/fail rates across implementations
- **Performance Charts**: Visual comparisons of execution time, memory usage, and throughput
- **Detailed Benchmark Pages**: Individual pages for each implementation with comprehensive metrics
- **Test Case Explorer**: Browse and filter test cases with results per implementation

#### 4. Data Flow & Deployment
```
Test Cases (JSON) → Rust Runner → Static Results (JSON) → GitHub Pages (React SPA)
```

**Static Deployment Architecture:**
- Website will be deployed as a static Single Page Application (SPA) to GitHub Pages
- All benchmark data will be pre-generated as static JSON files in `/public/test-results/latest/`
- No server-side components, websockets, or real-time data fetching required
- Data updates occur through CI/CD pipeline that regenerates static files and redeploys the site

#### 5. Key Features
- **Responsive Design**: Mobile-first approach using Linear Design System
- **Interactive Filtering**: Filter by implementation, test category, performance metrics
- **Static Data Consumption**: Load benchmark results from pre-generated static JSON files
- **Export Capabilities**: Download results as CSV/JSON for further analysis
- **Historical Tracking**: Compare results across different benchmark runs

### Implementation Phases

#### Phase 1: Foundation (Weeks 1-2)
- Set up React 19 + Mantine + Biome project structure
- Implement basic routing and layout components
- Create design system based on Linear Design principles

#### Phase 2: Rust Runner (Weeks 2-3)
- Develop Rust-based test runner to replace Python script
- Enhance JSON output format with additional metrics
- Ensure compatibility with existing test cases

#### Phase 3: Core Website Features (Weeks 3-5)
- Implement results dashboard with tables and basic charts
- Create individual benchmark pages for each implementation
- Add filtering and search capabilities

#### Phase 4: Advanced Visualization (Weeks 5-6)
- Implement comprehensive charts using Mantine Charts
- Add performance comparison visualizations
- Create interactive test case explorer

#### Phase 5: Polish & Optimization (Week 7)
- Apply Linear Design System styling
- Optimize performance and accessibility
- Add export and sharing features

## Consequences

### Positive
- **Improved Accessibility**: Users can easily compare FHIRPath implementations
- **Better Visibility**: Highlights fhirpath-rs performance advantages
- **Enhanced Developer Experience**: Modern tooling with TypeScript, Biome, and Vite
- **Maintainable Codebase**: Rust runner provides better performance and type safety
- **Scalable Architecture**: Can easily add new implementations or metrics

### Negative
- **Initial Development Time**: Significant upfront investment to build the website
- **Maintenance Overhead**: Additional codebase to maintain alongside implementations
- **Dependency Management**: Need to keep React, Mantine, and other dependencies updated

### Risks & Mitigations
- **Risk**: Rust runner compatibility issues
  - **Mitigation**: Thorough testing with existing test cases and gradual migration
- **Risk**: Performance issues with large datasets
  - **Mitigation**: Implement pagination, lazy loading, and data virtualization
- **Risk**: Design consistency across components
  - **Mitigation**: Establish design system early and use Mantine's consistent components

## Implementation Notes
- All development will follow Rust best practices and guidelines
- Website will be optimized for both desktop and mobile viewing
- Focus on accessibility (WCAG 2.1 AA compliance)
- SEO optimization for better discoverability
- Static deployment to GitHub Pages with manual or GitHub Actions-based updates
- All data consumed from pre-generated static JSON files in the repository

## Success Metrics
- Website loads in under 2 seconds on average connection
- All benchmark data is accurately represented
- Mobile responsiveness score > 95 on Lighthouse
- Accessibility score > 95 on Lighthouse
- User can find specific benchmark information within 3 clicks

---
**Date**: 2025-07-26  
**Author**: Development Team  
**Reviewers**: TBD
