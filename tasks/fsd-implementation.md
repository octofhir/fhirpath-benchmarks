# FSD Implementation Task: Feature-Sliced Design for UI Architecture

## Status: Not Started

## Overview
Implement Feature-Sliced Design (FSD) methodology for the FHIRPath benchmarking website to ensure scalable, maintainable, and team-friendly frontend architecture. This task focuses on setting up the proper FSD structure and organizing all UI components according to FSD principles.

## Background
Feature-Sliced Design is a frontend architecture methodology that organizes code by features and layers, promoting:
- **Predictable structure**: Clear hierarchy and dependencies
- **Feature isolation**: Self-contained business logic
- **Team scalability**: Parallel development capabilities
- **Maintainability**: Easy to understand and modify

## Tasks

### 1. FSD Project Structure Setup
- [ ] Create the main FSD directory structure:
  ```
  website/src/
  ├── app/                    # App layer
  ├── pages/                  # Pages layer
  ├── widgets/                # Widgets layer
  ├── features/               # Features layer
  ├── entities/               # Entities layer
  └── shared/                 # Shared layer
  ```
- [ ] Set up TypeScript path mapping for FSD layers in `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "~/app/*": ["./src/app/*"],
        "~/pages/*": ["./src/pages/*"],
        "~/widgets/*": ["./src/widgets/*"],
        "~/features/*": ["./src/features/*"],
        "~/entities/*": ["./src/entities/*"],
        "~/shared/*": ["./src/shared/*"]
      }
    }
  }
  ```
- [ ] Configure Vite to support FSD path aliases
- [ ] Create index.ts files for proper re-exports in each layer

### 2. App Layer Implementation
- [ ] Create `app/providers/` directory with:
  - `ThemeProvider.tsx` - Mantine theme configuration
  - `QueryProvider.tsx` - Data fetching provider
  - `RouterProvider.tsx` - React Router setup
  - `index.ts` - Combined providers export
- [ ] Set up `app/router/` with:
  - `routes.tsx` - Route definitions
  - `index.ts` - Router configuration
- [ ] Create `app/styles/` for:
  - `globals.css` - Global styles
  - `theme.ts` - Mantine theme customization
  - `variables.css` - CSS custom properties

### 3. Pages Layer Implementation
- [ ] Create page components following FSD structure:
  - `pages/landing/` - Landing page
    - `ui/LandingPage.tsx` - Main page component
    - `model/index.ts` - Page-specific logic
    - `index.ts` - Public API
  - `pages/dashboard/` - Results dashboard
  - `pages/benchmark-detail/` - Individual benchmark pages
  - `pages/test-explorer/` - Test case explorer
- [ ] Implement lazy loading for all page components
- [ ] Add proper SEO meta tags for each page
- [ ] Set up page-level error boundaries

### 4. Widgets Layer Implementation
- [ ] Create composite UI widgets:
  - `widgets/benchmark-table/` - Benchmark comparison table
    - `ui/BenchmarkTable.tsx` - Table component
    - `model/useTableData.ts` - Data management hook
    - `lib/tableUtils.ts` - Table utilities
    - `index.ts` - Public API
  - `widgets/performance-chart/` - Performance visualization
  - `widgets/test-results-grid/` - Test results matrix
  - `widgets/navigation-header/` - Main navigation
  - `widgets/filter-sidebar/` - Filtering interface
- [ ] Ensure widgets are self-contained and reusable
- [ ] Implement proper prop interfaces for all widgets
- [ ] Add loading and error states for each widget

### 5. Features Layer Implementation
- [ ] Create business logic features:
  - `features/benchmark-comparison/` - Compare implementations
    - `ui/ComparisonControls.tsx` - Comparison interface
    - `model/useComparison.ts` - Comparison logic
    - `api/comparisonApi.ts` - API calls
    - `lib/comparisonUtils.ts` - Utility functions
    - `index.ts` - Public API
  - `features/test-filtering/` - Filter and search functionality
  - `features/data-export/` - Export capabilities
  - `features/implementation-analysis/` - Detailed analysis
  - `features/theme-switcher/` - Theme management
- [ ] Implement feature-specific hooks and utilities
- [ ] Add proper TypeScript interfaces for feature contracts
- [ ] Ensure features don't directly depend on each other

### 6. Entities Layer Implementation
- [ ] Create business entities:
  - `entities/benchmark/` - Benchmark data models
    - `model/types.ts` - TypeScript interfaces
    - `model/store.ts` - State management
    - `api/benchmarkApi.ts` - API integration
    - `lib/benchmarkUtils.ts` - Utility functions
    - `index.ts` - Public API
  - `entities/test-case/` - Test case entities
  - `entities/implementation/` - Implementation metadata
  - `entities/performance-metric/` - Performance data models
- [ ] Implement data validation schemas using Zod
- [ ] Add entity-specific API clients
- [ ] Create entity transformation utilities

### 7. Shared Layer Implementation
- [ ] Set up `shared/ui/` components:
  - Base components (Button, Card, Input, etc.)
  - Layout components (Container, Grid, Stack)
  - Feedback components (Loading, Error, Empty states)
  - Data display components (Table, Chart wrappers)
- [ ] Create `shared/lib/` utilities:
  - `formatters/` - Data formatting functions
  - `validators/` - Validation utilities
  - `constants/` - Application constants
  - `hooks/` - Reusable custom hooks
- [ ] Implement `shared/api/` infrastructure:
  - Base API client configuration
  - Request/response interceptors
  - Error handling utilities
  - Type definitions for API responses
- [ ] Set up `shared/config/` for:
  - Environment variables
  - Application configuration
  - Feature flags

### 8. FSD Rules and Conventions
- [ ] Implement FSD import rules:
  - Layers can only import from layers below them
  - Same-layer imports are forbidden (except within same slice)
  - Use public APIs (index.ts) for all imports
- [ ] Create FSD documentation:
  - Architecture decision rationale
  - Layer responsibility definitions
  - Import/export conventions
  - Development guidelines

### 9. Integration with Existing Stack
- [ ] Integrate FSD with Mantine UI Kit 8:
  - Wrap Mantine components in shared/ui layer
  - Customize Mantine theme in app layer
  - Create FSD-compliant component variants
- [ ] Configure Biome for FSD structure:
  - Update formatting rules for FSD directories
  - Add import sorting rules for FSD layers
  - Configure path resolution for linting
- [ ] Ensure React 19 compatibility:
  - Use React 19 features appropriately in each layer
  - Implement proper concurrent features
  - Add React DevTools integration

### 10. Testing Strategy for FSD
- [ ] Set up layer-specific testing:
  - Unit tests for shared utilities and entities
  - Integration tests for features and widgets
  - E2E tests for pages and app layer
- [ ] Create testing utilities for each layer:
  - Mock providers for app layer testing
  - Test fixtures for entities
  - Component testing utilities for widgets
- [ ] Implement FSD-aware test organization:
  - Co-locate tests with their respective slices
  - Create shared test utilities
  - Set up proper test isolation

## Acceptance Criteria
- [ ] All code follows FSD layer hierarchy and import rules
- [ ] Each layer has clear responsibilities and boundaries
- [ ] TypeScript path mapping works correctly for all layers
- [ ] Components are properly organized and reusable
- [ ] Documentation clearly explains FSD structure and conventions
- [ ] Integration with Mantine, Biome, and React 19 is seamless
- [ ] Testing strategy covers all FSD layers appropriately

## Dependencies
- React 19 and TypeScript setup
- Mantine UI Kit 8 installation
- Biome configuration
- Vite build tool configuration

## Benefits
- **Scalability**: Easy to add new features and implementations
- **Maintainability**: Clear code organization and dependencies
- **Team Collaboration**: Parallel development without conflicts
- **Code Reusability**: Shared components and utilities
- **Type Safety**: Strong TypeScript integration across layers
- **Testing**: Clear testing boundaries and strategies

## Estimated Time: 1.5 weeks

## Notes
- Start with shared and entities layers as foundation
- Gradually migrate existing components to FSD structure
- Ensure proper documentation for team onboarding
- Consider future extensibility when designing layer APIs
- Maintain backward compatibility during migration

## References
- [Feature-Sliced Design Documentation](https://feature-sliced.design/)
- [FSD Examples and Best Practices](https://github.com/feature-sliced/examples)
