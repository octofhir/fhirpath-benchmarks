use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

use fhirpath_runner::{Config, Runner, TestCaseLoader};

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
    },

    /// Run performance benchmarks
    Benchmark {
        /// Specific languages to benchmark (default: all available)
        #[arg(short, long)]
        languages: Option<Vec<String>>,

        /// Number of benchmark iterations
        #[arg(short, long)]
        iterations: Option<usize>,

        /// Run benchmarks in parallel
        #[arg(short, long)]
        parallel: bool,
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
            setup_only,
            tests_only,
            benchmarks_only,
            parallel
        } => {
            run_command(runner, languages, setup_only, tests_only, benchmarks_only, parallel).await?;
        }

        Commands::Benchmark {
            languages,
            iterations: _,
            parallel
        } => {
            benchmark_command(runner, languages, parallel).await?;
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
    }

    Ok(())
}

async fn run_command(
    runner: Runner,
    languages: Option<Vec<String>>,
    setup_only: bool,
    tests_only: bool,
    benchmarks_only: bool,
    parallel: bool,
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

    if setup_only {
        println!("✅ Setup completed");
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
    parallel: bool,
) -> Result<()> {
    let available_languages = runner.get_available_implementations()?;
    let languages_to_test = languages.unwrap_or(available_languages);

    println!("⚡ Running benchmarks for: {}", languages_to_test.join(", "));

    // Setup implementations
    let setup_results = runner.setup_implementations(&languages_to_test).await?;
    let successful_languages: Vec<String> = setup_results
        .iter()
        .filter_map(|(lang, success)| if *success { Some(lang.clone()) } else { None })
        .collect();

    if successful_languages.is_empty() {
        anyhow::bail!("No implementations were successfully set up");
    }

    // Run benchmarks
    let benchmark_results = if parallel {
        runner.run_parallel_benchmarks(&successful_languages).await?
    } else {
        runner.run_benchmarks(&successful_languages).await?
    };

    // Generate report
    runner.generate_report(Vec::new(), benchmark_results)?;

    println!("🎉 Benchmarking completed!");
    Ok(())
}

async fn compare_command(runner: Runner) -> Result<()> {
    println!("📊 Generating comparison report from existing results...");

    // This would load existing results from files and generate a comparison
    // For now, we'll just show that the command exists
    println!("⚠️  Compare from existing results not yet implemented");

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
