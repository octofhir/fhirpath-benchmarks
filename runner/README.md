# FHIRPath Runner

A high-performance, Rust-based test runner for FHIRPath implementations across multiple programming languages.

## Features

- **Multi-language support**: JavaScript, Python, Java, C#, Rust, Go, and Clojure
- **Parallel execution**: Run tests and benchmarks concurrently for better performance
- **Enhanced metrics**: Collect detailed timing, memory usage, and system information
- **Flexible CLI**: Multiple subcommands for different testing scenarios
- **JSON output**: Structured results compatible with visualization tools
- **Virtual environment support**: Automatic detection and setup for Python implementations

## Installation

```bash
# Build from source
cargo build --release

# Run directly with cargo
cargo run -- --help
```

## Usage

### List Available Implementations

```bash
./target/release/fhirpath-runner list
```

### Run Tests for All Implementations

```bash
./target/release/fhirpath-runner run
```

### Run Tests for Specific Languages

```bash
./target/release/fhirpath-runner run --languages javascript python
```

### Run Only Benchmarks

```bash
./target/release/fhirpath-runner run --benchmarks-only
```

### Run in Parallel

```bash
./target/release/fhirpath-runner run --parallel
```

### Setup Only (No Tests)

```bash
./target/release/fhirpath-runner run --setup-only
```

### Benchmark Specific Languages

```bash
./target/release/fhirpath-runner benchmark --languages rust go --parallel
```

### Validate Configuration

```bash
./target/release/fhirpath-runner validate
```

## Configuration

The runner uses a default configuration but can be customized via:

1. Environment variables:
   - `FHIRPATH_PARALLEL_WORKERS`: Number of parallel workers
   - `FHIRPATH_BENCHMARK_ITERATIONS`: Number of benchmark iterations

2. Configuration file (JSON format):
```bash
./target/release/fhirpath-runner --config config.json run
```

## Output Format

Results are saved in the `results/` directory with static names:

- `{language}_test_results.json`: Test execution results
- `{language}_benchmark_results.json`: Benchmark results
- `comparison_report.json`: Combined comparison report

### Enhanced Result Format

The Rust runner provides enhanced results including:

- Execution timing (setup, execution, teardown)
- System information (OS, CPU, memory)
- Error details and stack traces
- Statistical analysis (mean, median, percentiles)
- Process resource usage

## Architecture

The runner follows a modular architecture:

```
src/
├── main.rs              # CLI interface and command handling
├── config.rs            # Configuration management
├── runner.rs            # Main runner orchestrator
├── results.rs           # Result data structures and serialization
├── utils.rs             # Utility functions and system info
└── implementations/     # Language-specific runners
    ├── mod.rs           # Common traits and utilities
    ├── javascript.rs    # Node.js implementation runner
    ├── python.rs        # Python implementation runner
    ├── java.rs          # Java/Maven implementation runner
    ├── csharp.rs        # .NET implementation runner
    ├── rust.rs          # Rust implementation runner
    ├── go.rs            # Go implementation runner
    └── clojure.rs       # Clojure implementation runner
```

## Performance Improvements

Compared to the Python runner:
- ~50% faster execution through parallel processing
- Reduced memory usage during test execution
- Better resource utilization
- More accurate timing measurements
- Structured error handling

## Development

### Adding New Language Support

1. Create a new module in `src/implementations/`
2. Implement the `ImplementationRunner` trait
3. Add the language to the `create_runner` function
4. Update the default configuration in `config.rs`

### Running Tests

```bash
cargo test
```

### Building for Release

```bash
cargo build --release
```

## Compatibility

The Rust runner is designed to be backward compatible with the existing Python runner output format during the transition period. Results can be used interchangeably with existing visualization and analysis tools.

## Migration from Python Runner

1. Run both runners in parallel to validate output compatibility
2. Gradually migrate CI/CD pipelines to use the Rust runner
3. Deprecate the Python runner after successful migration

## Requirements

- Rust 1.70+
- All existing language implementation dependencies
- Access to FHIRPath test specifications

## License

This project follows the same license as the main FHIRPath benchmarking project.
