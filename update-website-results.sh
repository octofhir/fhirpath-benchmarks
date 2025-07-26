#!/bin/bash

# Script to run FHIRPath tests and benchmarks, then copy results to website public directory
# Usage: ./update-website-results.sh [--tests-only|--benchmarks-only]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$SCRIPT_DIR/runner"
RESULTS_DIR="$SCRIPT_DIR/results"
WEBSITE_PUBLIC_DIR="$SCRIPT_DIR/website/public/test-results/latest"

echo "🚀 Starting FHIRPath test runner and website update process..."

# Parse command line arguments
RUN_TESTS=true
RUN_BENCHMARKS=true

case "${1:-}" in
    --tests-only)
        RUN_BENCHMARKS=false
        echo "📋 Running tests only"
        ;;
    --benchmarks-only)
        RUN_TESTS=false
        echo "⚡ Running benchmarks only"
        ;;
    *)
        echo "📋⚡ Running both tests and benchmarks"
        ;;
esac

# Change to runner directory
cd "$RUNNER_DIR"

# Run tests if requested
if [ "$RUN_TESTS" = true ]; then
    echo "🧪 Running tests for all implementations..."
    if cargo run -- run --tests-only; then
        echo "✅ Tests completed successfully"
    else
        echo "⚠️  Some tests may have failed, but continuing..."
    fi
fi

# Run benchmarks if requested
if [ "$RUN_BENCHMARKS" = true ]; then
    echo "⚡ Running benchmarks for all implementations..."
    if cargo run -- run --benchmarks-only; then
        echo "✅ Benchmarks completed successfully"
    else
        echo "⚠️  Some benchmarks may have failed, but continuing..."
    fi
fi

# Generate comparison report
echo "📊 Generating comparison report..."
if cargo run -- compare; then
    echo "✅ Comparison report generated successfully"
else
    echo "⚠️  Comparison report generation may have issues, but continuing..."
fi

# Copy results to website public directory
echo "📁 Copying results to website public directory..."

# Ensure the target directory exists
mkdir -p "$WEBSITE_PUBLIC_DIR"

# Copy test results
if [ "$RUN_TESTS" = true ]; then
    echo "📋 Copying test results..."
    cp "$RESULTS_DIR"/*_test_results.json "$WEBSITE_PUBLIC_DIR/" 2>/dev/null || echo "⚠️  No test results found to copy"
fi

# Copy benchmark results
if [ "$RUN_BENCHMARKS" = true ]; then
    echo "⚡ Copying benchmark results..."
    cp "$RESULTS_DIR"/*_benchmark_results.json "$WEBSITE_PUBLIC_DIR/" 2>/dev/null || echo "⚠️  No benchmark results found to copy"
fi

# Copy comparison reports
echo "📊 Copying comparison reports..."
cp "$RESULTS_DIR"/comparison_report*.json "$WEBSITE_PUBLIC_DIR/" 2>/dev/null || echo "⚠️  No comparison reports found to copy"

# Display final status
echo ""
echo "✅ Website results update completed!"
echo "📁 Results copied to: $WEBSITE_PUBLIC_DIR"
echo ""
echo "📋 Available files:"
ls -la "$WEBSITE_PUBLIC_DIR" | grep -E "\.(json)$" | wc -l | xargs echo "   Total JSON files:"
ls -la "$WEBSITE_PUBLIC_DIR" | grep "_test_results.json" | wc -l | xargs echo "   Test result files:"
ls -la "$WEBSITE_PUBLIC_DIR" | grep "_benchmark_results.json" | wc -l | xargs echo "   Benchmark result files:"
ls -la "$WEBSITE_PUBLIC_DIR" | grep "comparison_report" | wc -l | xargs echo "   Comparison reports:"

echo ""
echo "🌐 The website can now load the updated results from the public directory."
echo "💡 To run this script:"
echo "   ./update-website-results.sh                 # Run both tests and benchmarks"
echo "   ./update-website-results.sh --tests-only    # Run tests only"
echo "   ./update-website-results.sh --benchmarks-only # Run benchmarks only"
