#!/bin/bash

# Unified runner for FHIRPath tests, benchmarks, and comparison reports
# Usage: ./run-all.sh [OPTIONS]
# Options:
#   --parallel      Run implementations in parallel
#   --tests-only    Run only tests (skip benchmarks)
#   --benchmarks-only  Run only benchmarks (skip tests)
#   --languages     Comma-separated list of languages to test (e.g., "rust,go,python")
#   --help          Show this help message

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$SCRIPT_DIR/runner"
RESULTS_DIR="$SCRIPT_DIR/results"
WEBSITE_PUBLIC_DIR="$SCRIPT_DIR/website/public/test-results/latest"

# Default options
PARALLEL=""
TESTS_ONLY=""
BENCHMARKS_ONLY=""
LANGUAGES=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel)
            PARALLEL="--parallel"
            shift
            ;;
        --tests-only)
            TESTS_ONLY="--tests-only"
            shift
            ;;
        --benchmarks-only)
            BENCHMARKS_ONLY="--benchmarks-only"
            shift
            ;;
        --languages)
            LANGUAGES="--languages $2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Unified runner for FHIRPath tests, benchmarks, and comparison reports"
            echo ""
            echo "Options:"
            echo "  --parallel          Run implementations in parallel for better performance"
            echo "  --tests-only        Run only tests (skip benchmarks)"
            echo "  --benchmarks-only   Run only benchmarks (skip tests)"
            echo "  --languages LIST    Comma-separated list of languages to test"
            echo "                      Available: javascript, python, java, csharp, rust, go, clojure"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Run all tests and benchmarks"
            echo "  $0 --parallel                        # Run everything in parallel"
            echo "  $0 --tests-only                      # Run only tests"
            echo "  $0 --benchmarks-only --parallel      # Run only benchmarks in parallel"
            echo "  $0 --languages rust,go,python        # Test only specific languages"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🚀 Starting unified FHIRPath test runner..."
echo "📁 Working directory: $SCRIPT_DIR"

# Build the runner first
echo "🔨 Building FHIRPath runner..."
cd "$RUNNER_DIR"
if cargo build --release; then
    echo "✅ Runner built successfully"
else
    echo "❌ Failed to build runner"
    exit 1
fi

# Prepare runner command
RUNNER_CMD="./target/release/fhirpath-runner run"

# Add options to runner command
if [[ -n "$LANGUAGES" ]]; then
    RUNNER_CMD="$RUNNER_CMD $LANGUAGES"
fi

if [[ -n "$PARALLEL" ]]; then
    RUNNER_CMD="$RUNNER_CMD $PARALLEL"
fi

if [[ -n "$TESTS_ONLY" ]]; then
    RUNNER_CMD="$RUNNER_CMD $TESTS_ONLY"
elif [[ -n "$BENCHMARKS_ONLY" ]]; then
    RUNNER_CMD="$RUNNER_CMD $BENCHMARKS_ONLY"
fi

# Execute the runner
echo "🏃 Executing: $RUNNER_CMD"
if eval "$RUNNER_CMD"; then
    echo "✅ Test/benchmark execution completed successfully"
else
    echo "⚠️  Some tests/benchmarks may have failed, but continuing with report generation..."
fi

# Generate comparison report
echo "📊 Generating comprehensive comparison report..."
if ./target/release/fhirpath-runner compare; then
    echo "✅ Comparison report generated successfully"
else
    echo "⚠️  Comparison report generation encountered issues, but continuing..."
fi

# Copy results to website public directory
echo "📁 Copying results to website public directory..."
mkdir -p "$WEBSITE_PUBLIC_DIR"

# Copy all JSON result files
echo "📋 Copying result files..."
if ls "$RESULTS_DIR"/*.json 1> /dev/null 2>&1; then
    cp "$RESULTS_DIR"/*.json "$WEBSITE_PUBLIC_DIR/" 2>/dev/null || echo "⚠️  Some result files couldn't be copied"
    echo "✅ Result files copied successfully"
else
    echo "⚠️  No result files found to copy"
fi

# Copy implementations metadata if it exists
if [[ -f "$SCRIPT_DIR/website/public/implementations.json" ]]; then
    cp "$SCRIPT_DIR/website/public/implementations.json" "$WEBSITE_PUBLIC_DIR/"
    echo "✅ Implementations metadata copied"
fi

# Display summary
echo ""
echo "🎉 Unified runner completed successfully!"
echo "📊 Results summary:"
echo "   📁 Results directory: $RESULTS_DIR"
echo "   🌐 Website directory: $WEBSITE_PUBLIC_DIR"

# Count and display file statistics
TEST_FILES=$(ls "$WEBSITE_PUBLIC_DIR"/*_test_results.json 2>/dev/null | wc -l | tr -d ' ')
BENCHMARK_FILES=$(ls "$WEBSITE_PUBLIC_DIR"/*_benchmark_results.json 2>/dev/null | wc -l | tr -d ' ')
COMPARISON_FILES=$(ls "$WEBSITE_PUBLIC_DIR"/comparison_report*.json 2>/dev/null | wc -l | tr -d ' ')

echo "   📋 Test result files: $TEST_FILES"
echo "   ⚡ Benchmark result files: $BENCHMARK_FILES"
echo "   📊 Comparison reports: $COMPARISON_FILES"

if [[ -f "$WEBSITE_PUBLIC_DIR/comparison_report.json" ]]; then
    echo ""
    echo "🌐 Website is ready to display updated results!"
    echo "💡 You can now view the results at your website URL"
fi

echo ""
echo "✨ All done! Use --help for more options."