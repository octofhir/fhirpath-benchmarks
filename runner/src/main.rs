use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

use fhirpath_runner::{Config, Runner, TestCaseLoader, TestCaseFilter};

#[derive(Parser)]
#[command(name = "fhirpath-runner")]
#[command(about = "High-performance test runner for FHIRPath implementations")]
#[command(version = env!("CARGO_PKG_VERSION"))]
struct Cli {
    /// Configuration file path
    #[arg(short, long)]
    config: Option<PathBuf>,

    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Execute tests for specific implementations
    Run {
        /// Specific languages to test (default: all available)
        #[arg(short, long)]
        languages: Option<Vec<String>>,

        /// Filter test cases by name pattern
        #[arg(long)]
        filter_name: Option<String>,

        /// Filter test cases by tags
        #[arg(long)]
        filter_tags: Option<Vec<String>>,

        /// Filter test cases by expression pattern
        #[arg(long)]
        filter_expression: Option<String>,

        /// Include disabled test cases
        #[arg(long)]
        include_disabled: bool,

        /// Only setup dependencies, don't run tests
        #[arg(long)]
        setup_only: bool,

        /// Only run tests, skip benchmarks
        #[arg(long)]
        tests_only: bool,

        /// Only run benchmarks, skip tests
        #[arg(long)]
        benchmarks_only: bool,

        /// Run tests and benchmarks in parallel
        #[arg(short, long)]
        parallel: bool,

        /// Dry run: validate setup without executing tests
        #[arg(long)]
        dry_run: bool,
    },

    /// Run performance benchmarks
    Benchmark {
        /// Specific languages to benchmark (default: all available)
        #[arg(short, long)]
        languages: Option<Vec<String>>,

        /// Number of benchmark iterations per test case (default: 5)
        #[arg(short, long, default_value = "5")]
        iterations: usize,

        /// Number of warmup iterations for JIT languages (default: 2)
        #[arg(short, long, default_value = "2")]
        warmup: usize,

        /// Run benchmarks in parallel
        #[arg(short, long)]
        parallel: bool,

        /// Collect detailed performance metrics (memory, CPU)
        #[arg(long)]
        detailed_metrics: bool,

        /// Only run benchmarks for specific test categories
        #[arg(long)]
        categories: Option<Vec<String>>,
    },

    /// Generate comparison reports
    Compare {
        /// Generate report from existing results
        #[arg(long)]
        from_existing: bool,
    },

    /// Validate test cases and configurations
    Validate {
        /// Path to test cases directory
        #[arg(short, long)]
        test_cases: Option<PathBuf>,
    },

    /// List available implementations
    List,

    /// Export existing results to different formats
    Export {
        /// Export format (csv, html)
        #[arg(short, long, default_value = "csv")]
        format: String,

        /// Specific languages to export (default: all available)
        #[arg(short, long)]
        languages: Option<Vec<String>>,

        /// Export test results
        #[arg(long)]
        tests: bool,

        /// Export benchmark results
        #[arg(long)]
        benchmarks: bool,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Setup logging based on verbosity
    if cli.verbose {
        println!("🚀 Starting FHIRPath Runner v{}", env!("CARGO_PKG_VERSION"));
    }

    // Load configuration
    let config = if let Some(config_path) = cli.config {
        Config::load_from_file(&config_path)?
    } else {
        Config::load_with_env_overrides()?
    };

    let runner = Runner::new(config);

    // Validate setup
    runner.validate_setup()?;

    match cli.command {
        Commands::Run {
            languages,
            filter_name,
            filter_tags,
            filter_expression,
            include_disabled,
            setup_only,
            tests_only,
            benchmarks_only,
            parallel,
            dry_run
        } => {
            run_command(
                runner,
                languages,
                filter_name,
                filter_tags,
                filter_expression,
                include_disabled,
                setup_only,
                tests_only,
                benchmarks_only,
                parallel,
                dry_run
            ).await?;
        }

        Commands::Benchmark {
            languages,
            iterations,
            warmup,
            parallel,
            detailed_metrics,
            categories
        } => {
            benchmark_command(runner, languages, iterations, warmup, parallel, detailed_metrics, categories).await?;
        }

        Commands::Compare { from_existing: _ } => {
            compare_command(runner).await?;
        }

        Commands::Validate { test_cases: _ } => {
            validate_command(runner).await?;
        }

        Commands::List => {
            list_command(runner).await?;
        }

        Commands::Export { format, languages, tests, benchmarks } => {
            export_command(runner, format, languages, tests, benchmarks).await?;
        }
    }

    Ok(())
}

async fn run_command(
    runner: Runner,
    languages: Option<Vec<String>>,
    filter_name: Option<String>,
    filter_tags: Option<Vec<String>>,
    filter_expression: Option<String>,
    include_disabled: bool,
    setup_only: bool,
    tests_only: bool,
    benchmarks_only: bool,
    parallel: bool,
    dry_run: bool,
) -> Result<()> {
    // Determine which languages to test
    let available_languages = runner.get_available_implementations()?;
    let languages_to_test = languages.unwrap_or(available_languages.clone());

    println!("🚀 Starting FHIRPath library comparison");
    println!("🔍 Available implementations: {}", available_languages.join(", "));
    println!("🎯 Testing languages: {}", languages_to_test.join(", "));

    // Setup implementations
    let setup_results = runner.setup_implementations(&languages_to_test).await?;
    let successful_languages: Vec<String> = setup_results
        .iter()
        .filter_map(|(lang, success)| if *success { Some(lang.clone()) } else { None })
        .collect();

    if setup_only || dry_run {
        if dry_run {
            println!("✅ Dry run completed - setup validation passed");
        } else {
            println!("✅ Setup completed");
        }
        return Ok(());
    }

    if successful_languages.is_empty() {
        anyhow::bail!("No implementations were successfully set up");
    }

    // Run tests and benchmarks
    let mut test_results = Vec::new();
    let mut benchmark_results = Vec::new();

    if !benchmarks_only {
        test_results = if parallel {
            runner.run_parallel_tests(&successful_languages).await?
        } else {
            runner.run_tests(&successful_languages).await?
        };
    }

    if !tests_only {
        benchmark_results = if parallel {
            runner.run_parallel_benchmarks(&successful_languages).await?
        } else {
            runner.run_benchmarks(&successful_languages).await?
        };
    }

    // Generate report
    if !test_results.is_empty() || !benchmark_results.is_empty() {
        runner.generate_report(test_results, benchmark_results)?;
    }

    println!("\n🎉 Comparison completed!");
    Ok(())
}

async fn benchmark_command(
    runner: Runner,
    languages: Option<Vec<String>>,
    iterations: usize,
    warmup: usize,
    parallel: bool,
    detailed_metrics: bool,
    categories: Option<Vec<String>>,
) -> Result<()> {
    let available_languages = runner.get_available_implementations()?;
    let languages_to_test = languages.unwrap_or(available_languages);

    println!("⚡ Running benchmarks for: {}", languages_to_test.join(", "));
    println!("🔄 Iterations: {}, Warmup: {}", iterations, warmup);
    if detailed_metrics {
        println!("📊 Collecting detailed performance metrics");
    }
    if let Some(ref cats) = categories {
        println!("🏷️  Categories: {}", cats.join(", "));
    }

    // Setup implementations
    let setup_results = runner.setup_implementations(&languages_to_test).await?;
    let successful_languages: Vec<String> = setup_results
        .iter()
        .filter_map(|(lang, success)| if *success { Some(lang.clone()) } else { None })
        .collect();

    if successful_languages.is_empty() {
        anyhow::bail!("No implementations were successfully set up");
    }

    // Run benchmarks with enhanced configuration
    let benchmark_results = if parallel {
        runner.run_parallel_benchmarks_enhanced(&successful_languages, iterations, warmup, detailed_metrics, categories).await?
    } else {
        runner.run_benchmarks_enhanced(&successful_languages, iterations, warmup, detailed_metrics, categories).await?
    };

    // Generate report
    runner.generate_report(Vec::new(), benchmark_results)?;

    println!("🎉 Benchmarking completed!");
    Ok(())
}

async fn compare_command(runner: Runner) -> Result<()> {
    println!("📊 Generating comparison report from existing results...");

    let config = runner.get_config();
    let results_dir = &config.results_dir;

    // Load all existing test results
    let mut test_results = Vec::new();
    let mut benchmark_results = Vec::new();

    // Get all available languages from result files
    let available_languages = runner.get_available_implementations()?;

    for language in &available_languages {
        // Load test results
        let test_file = results_dir.join(format!("{}_test_results.json", language));
        if test_file.exists() {
            match tokio::fs::read_to_string(&test_file).await {
                Ok(content) => {
                    match serde_json::from_str::<fhirpath_runner::TestResult>(&content) {
                        Ok(result) => {
                            println!("✅ Loaded test results for {}", language);
                            test_results.push(result);
                        }
                        Err(e) => {
                            println!("⚠️  Failed to parse test results for {}: {}", language, e);
                        }
                    }
                }
                Err(e) => {
                    println!("⚠️  Failed to read test results for {}: {}", language, e);
                }
            }
        } else {
            println!("⚠️  No test results found for {}", language);
        }

        // Load benchmark results
        let benchmark_file = results_dir.join(format!("{}_benchmark_results.json", language));
        if benchmark_file.exists() {
            match tokio::fs::read_to_string(&benchmark_file).await {
                Ok(content) => {
                    match serde_json::from_str::<fhirpath_runner::BenchmarkResult>(&content) {
                        Ok(result) => {
                            println!("✅ Loaded benchmark results for {}", language);
                            benchmark_results.push(result);
                        }
                        Err(e) => {
                            println!("⚠️  Failed to parse benchmark results for {}: {}", language, e);
                        }
                    }
                }
                Err(e) => {
                    println!("⚠️  Failed to read benchmark results for {}: {}", language, e);
                }
            }
        } else {
            println!("⚠️  No benchmark results found for {}", language);
        }
    }

    // Generate comprehensive comparison report
    if !test_results.is_empty() || !benchmark_results.is_empty() {
        println!("📊 Generating comparison report with {} test results and {} benchmark results",
                 test_results.len(), benchmark_results.len());
        runner.generate_report(test_results, benchmark_results)?;
        println!("✅ Comprehensive comparison report generated successfully");
    } else {
        println!("⚠️  No results found to generate comparison report");
    }

    Ok(())
}

async fn validate_command(runner: Runner) -> Result<()> {
    println!("✅ Validating configurations and test cases...");

    // Validate runner setup
    runner.validate_setup()?;

    // Validate test cases
    let config = runner.get_config();
    let mut test_loader = TestCaseLoader::new(config.specs_dir.clone());

    // Load all test suites
    test_loader.load_all_test_suites()?;

    // Validate test cases
    let validation_errors = test_loader.validate_test_cases();

    if validation_errors.is_empty() {
        println!("✅ All test cases are valid!");
    } else {
        println!("⚠️  Found {} validation errors:", validation_errors.len());
        for error in validation_errors {
            println!("  {error}");
        }
    }

    println!("✅ Configuration validation passed!");
    Ok(())
}

async fn list_command(runner: Runner) -> Result<()> {
    let available_implementations = runner.get_available_implementations()?;

    println!("Available FHIRPath implementations:");
    for impl_name in available_implementations {
        println!("  • {}", impl_name);
    }

    Ok(())
}

async fn export_command(
    runner: Runner,
    format: String,
    languages: Option<Vec<String>>,
    export_tests: bool,
    export_benchmarks: bool,
) -> Result<()> {
    let available_languages = runner.get_available_implementations()?;
    let languages_to_export = languages.unwrap_or(available_languages);

    if !export_tests && !export_benchmarks {
        println!("⚠️  Please specify --tests or --benchmarks (or both)");
        return Ok(());
    }

    if !matches!(format.as_str(), "csv" | "html") {
        anyhow::bail!("Unsupported export format: {}. Use 'csv' or 'html'", format);
    }

    println!("📤 Exporting {} format for: {}", format, languages_to_export.join(", "));

    let config = runner.get_config();
    let results_dir = &config.results_dir;

    for language in &languages_to_export {
        if export_tests {
            // Find and export latest test results
            if let Some(test_result) = runner.load_latest_test_result(language).await? {
                match format.as_str() {
                    "csv" => {
                        let csv_path = test_result.export_to_csv(results_dir)?;
                        println!("✅ Exported {} test results to: {}", language, csv_path.display());
                    }
                    "html" => {
                        let html_path = test_result.export_to_html(results_dir)?;
                        println!("✅ Exported {} test results to: {}", language, html_path.display());
                    }
                    _ => unreachable!(),
                }
            } else {
                println!("⚠️  No test results found for {}", language);
            }
        }

        if export_benchmarks {
            // Find and export latest benchmark results
            if let Some(benchmark_result) = runner.load_latest_benchmark_result(language).await? {
                match format.as_str() {
                    "csv" => {
                        let csv_path = benchmark_result.export_to_csv(results_dir)?;
                        println!("✅ Exported {} benchmark results to: {}", language, csv_path.display());
                    }
                    "html" => {
                        let html_path = benchmark_result.export_to_html(results_dir)?;
                        println!("✅ Exported {} benchmark results to: {}", language, html_path.display());
                    }
                    _ => unreachable!(),
                }
            } else {
                println!("⚠️  No benchmark results found for {}", language);
            }
        }
    }

    println!("🎉 Export completed!");
    Ok(())
}
