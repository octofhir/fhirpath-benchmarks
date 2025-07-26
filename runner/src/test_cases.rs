use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSuite {
    pub name: String,
    pub description: Option<String>,
    pub source: Option<String>,
    pub tests: Vec<TestCase>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCase {
    pub name: String,
    pub expression: String,
    pub input: Option<serde_json::Value>,
    pub inputfile: Option<String>,
    pub expected: serde_json::Value,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub disable: Option<bool>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TestCaseLoader {
    specs_dir: PathBuf,
    loaded_suites: HashMap<String, TestSuite>,
    input_files: HashMap<String, serde_json::Value>,
}

impl TestCaseLoader {
    pub fn new(specs_dir: PathBuf) -> Self {
        Self {
            specs_dir,
            loaded_suites: HashMap::new(),
            input_files: HashMap::new(),
        }
    }

    pub fn load_all_test_suites(&mut self) -> Result<()> {
        let test_dir = self.specs_dir.join("fhirpath/tests");

        if !test_dir.exists() {
            anyhow::bail!("FHIRPath tests directory not found: {:?}", test_dir);
        }

        // Load input files first
        self.load_input_files()?;

        // Load all test suite files
        for entry in std::fs::read_dir(&test_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.extension().map_or(false, |ext| ext == "json") {
                if let Some(filename) = path.file_stem().and_then(|s| s.to_str()) {
                    // Skip input directory
                    if filename == "input" {
                        continue;
                    }

                    match self.load_test_suite(&path) {
                        Ok(suite) => {
                            println!("✅ Loaded test suite: {} ({} tests)", suite.name, suite.tests.len());
                            self.loaded_suites.insert(filename.to_string(), suite);
                        }
                        Err(e) => {
                            println!("⚠️  Failed to load test suite {}: {}", filename, e);
                        }
                    }
                }
            }
        }

        println!("📋 Loaded {} test suites with {} total test cases",
                self.loaded_suites.len(),
                self.get_total_test_count());

        Ok(())
    }

    fn load_input_files(&mut self) -> Result<()> {
        let input_dir = self.specs_dir.join("fhirpath/tests/input");

        if !input_dir.exists() {
            println!("⚠️  Input directory not found: {:?}", input_dir);
            return Ok(());
        }

        for entry in std::fs::read_dir(&input_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.extension().map_or(false, |ext| ext == "json") {
                if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                    match self.load_input_file(&path) {
                        Ok(data) => {
                            self.input_files.insert(filename.to_string(), data);
                        }
                        Err(e) => {
                            println!("⚠️  Failed to load input file {}: {}", filename, e);
                        }
                    }
                }
            }
        }

        println!("📁 Loaded {} input files", self.input_files.len());
        Ok(())
    }

    fn load_test_suite(&self, path: &PathBuf) -> Result<TestSuite> {
        let content = std::fs::read_to_string(path)?;
        let suite: TestSuite = serde_json::from_str(&content)?;
        Ok(suite)
    }

    fn load_input_file(&self, path: &PathBuf) -> Result<serde_json::Value> {
        let content = std::fs::read_to_string(path)?;
        let data: serde_json::Value = serde_json::from_str(&content)?;
        Ok(data)
    }

    pub fn get_test_suites(&self) -> &HashMap<String, TestSuite> {
        &self.loaded_suites
    }

    pub fn get_input_files(&self) -> &HashMap<String, serde_json::Value> {
        &self.input_files
    }

    pub fn get_total_test_count(&self) -> usize {
        self.loaded_suites.values().map(|suite| suite.tests.len()).sum()
    }

    pub fn get_test_suite(&self, name: &str) -> Option<&TestSuite> {
        self.loaded_suites.get(name)
    }

    pub fn get_input_data(&self, filename: &str) -> Option<&serde_json::Value> {
        self.input_files.get(filename)
    }

    pub fn filter_test_cases(&self, filter: &TestCaseFilter) -> Vec<FilteredTestCase> {
        let mut filtered_cases = Vec::new();

        for (suite_name, suite) in &self.loaded_suites {
            for test_case in &suite.tests {
                if self.matches_filter(test_case, filter) {
                    let input_data = test_case.inputfile
                        .as_ref()
                        .and_then(|filename| self.get_input_data(filename))
                        .or(test_case.input.as_ref());

                    filtered_cases.push(FilteredTestCase {
                        suite_name: suite_name.clone(),
                        test_case: test_case.clone(),
                        input_data: input_data.cloned(),
                    });
                }
            }
        }

        filtered_cases
    }

    fn matches_filter(&self, test_case: &TestCase, filter: &TestCaseFilter) -> bool {
        // Skip disabled tests unless explicitly included
        if test_case.disable.unwrap_or(false) && !filter.include_disabled {
            return false;
        }

        // Filter by test name pattern
        if let Some(ref name_pattern) = filter.name_pattern {
            if !test_case.name.contains(name_pattern) {
                return false;
            }
        }

        // Filter by tags
        if !filter.tags.is_empty() {
            if let Some(ref test_tags) = test_case.tags {
                if !filter.tags.iter().any(|tag| test_tags.contains(tag)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Filter by expression pattern
        if let Some(ref expr_pattern) = filter.expression_pattern {
            if !test_case.expression.contains(expr_pattern) {
                return false;
            }
        }

        true
    }

    pub fn validate_test_cases(&self) -> Vec<ValidationError> {
        let mut errors = Vec::new();

        for (suite_name, suite) in &self.loaded_suites {
            for (test_idx, test_case) in suite.tests.iter().enumerate() {
                // Check for required fields
                if test_case.name.is_empty() {
                    errors.push(ValidationError {
                        suite_name: suite_name.clone(),
                        test_name: test_case.name.clone(),
                        test_index: test_idx,
                        error_type: ValidationErrorType::MissingName,
                        message: "Test case name is empty".to_string(),
                    });
                }

                if test_case.expression.is_empty() {
                    errors.push(ValidationError {
                        suite_name: suite_name.clone(),
                        test_name: test_case.name.clone(),
                        test_index: test_idx,
                        error_type: ValidationErrorType::MissingExpression,
                        message: "Test case expression is empty".to_string(),
                    });
                }

                // Check input file references
                if let Some(ref inputfile) = test_case.inputfile {
                    if !self.input_files.contains_key(inputfile) {
                        errors.push(ValidationError {
                            suite_name: suite_name.clone(),
                            test_name: test_case.name.clone(),
                            test_index: test_idx,
                            error_type: ValidationErrorType::MissingInputFile,
                            message: format!("Referenced input file not found: {}", inputfile),
                        });
                    }
                }

                // Check for both input and inputfile specified
                if test_case.input.is_some() && test_case.inputfile.is_some() {
                    errors.push(ValidationError {
                        suite_name: suite_name.clone(),
                        test_name: test_case.name.clone(),
                        test_index: test_idx,
                        error_type: ValidationErrorType::ConflictingInput,
                        message: "Test case has both 'input' and 'inputfile' specified".to_string(),
                    });
                }
            }
        }

        errors
    }
}

#[derive(Debug, Clone)]
pub struct TestCaseFilter {
    pub name_pattern: Option<String>,
    pub tags: Vec<String>,
    pub expression_pattern: Option<String>,
    pub include_disabled: bool,
}

impl Default for TestCaseFilter {
    fn default() -> Self {
        Self {
            name_pattern: None,
            tags: Vec::new(),
            expression_pattern: None,
            include_disabled: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct FilteredTestCase {
    pub suite_name: String,
    pub test_case: TestCase,
    pub input_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct ValidationError {
    pub suite_name: String,
    pub test_name: String,
    pub test_index: usize,
    pub error_type: ValidationErrorType,
    pub message: String,
}

#[derive(Debug, Clone)]
pub enum ValidationErrorType {
    MissingName,
    MissingExpression,
    MissingInputFile,
    ConflictingInput,
    InvalidJson,
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}:{}] {}: {}",
               self.suite_name,
               self.test_name,
               match self.error_type {
                   ValidationErrorType::MissingName => "Missing Name",
                   ValidationErrorType::MissingExpression => "Missing Expression",
                   ValidationErrorType::MissingInputFile => "Missing Input File",
                   ValidationErrorType::ConflictingInput => "Conflicting Input",
                   ValidationErrorType::InvalidJson => "Invalid JSON",
               },
               self.message)
    }
}
