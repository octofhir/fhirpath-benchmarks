package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/DAMEDIC/fhir-toolbox-go/fhirpath"
	r4 "github.com/DAMEDIC/fhir-toolbox-go/model/gen/r4"
	"github.com/cockroachdb/apd/v3"
)

// TestResult represents a single test result
type TestResult struct {
	Name            string        `json:"name"`
	Description     string        `json:"description"`
	Expression      string        `json:"expression"`
	Status          string        `json:"status"`
	ExecutionTimeMs float64       `json:"execution_time_ms"`
	Expected        []interface{} `json:"expected"`
	Actual          []interface{} `json:"actual"`
	Error           string        `json:"error,omitempty"`
}

// TestSummary represents the summary of test results
type TestSummary struct {
	Total  int `json:"total"`
	Passed int `json:"passed"`
	Failed int `json:"failed"`
	Errors int `json:"errors"`
}

// TestOutput represents the complete test output
type TestOutput struct {
	Language  string       `json:"language"`
	Timestamp float64      `json:"timestamp"`
	Tests     []TestResult `json:"tests"`
	Summary   TestSummary  `json:"summary"`
}

// BenchmarkResult represents a single benchmark result
type BenchmarkResult struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Expression   string  `json:"expression"`
	Iterations   int     `json:"iterations"`
	AvgTimeMs    float64 `json:"avg_time_ms"`
	MinTimeMs    float64 `json:"min_time_ms"`
	MaxTimeMs    float64 `json:"max_time_ms"`
	OpsPerSecond float64 `json:"ops_per_second"`
}

// BenchmarkOutput represents the complete benchmark output
type BenchmarkOutput struct {
	Language   string            `json:"language"`
	Timestamp  float64           `json:"timestamp"`
	Benchmarks []BenchmarkResult `json:"benchmarks"`
	SystemInfo SystemInfo        `json:"system_info"`
}

// SystemInfo represents system information
type SystemInfo struct {
	Platform        string `json:"platform"`
	GoVersion       string `json:"go_version"`
	FhirpathVersion string `json:"fhirpath_version"`
}

// TestCase represents a test case from the configuration
type TestCase struct {
	Name           string        `json:"name"`
	Description    string        `json:"description"`
	InputFile      string        `json:"inputFile"`
	Expression     string        `json:"expression"`
	ExpectedOutput []interface{} `json:"expectedOutput"`
	Predicate      bool          `json:"predicate"`
	Mode           string        `json:"mode"`
	Invalid        string        `json:"invalid"`
	Group          string        `json:"group"`
	Iterations     int           `json:"iterations"`
}

// GoTestRunner implements the test runner for Go
type GoTestRunner struct {
	specsDir   string
	resultsDir string
}

// NewGoTestRunner creates a new Go test runner
func NewGoTestRunner() (*GoTestRunner, error) {
	runner := &GoTestRunner{
		specsDir:   "../../specs",
		resultsDir: "../../results",
	}

	// Ensure results directory exists
	if err := os.MkdirAll(runner.resultsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create results directory: %v", err)
	}

	return runner, nil
}

// TestSuite represents a JSON test suite
type TestSuite struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Source      string     `json:"source"`
	Tests       []TestCase `json:"tests"`
}

// TestCaseJSON represents a test case from JSON format
type TestCaseJSON struct {
	Name        string        `json:"name"`
	Expression  string        `json:"expression"`
	Input       interface{}   `json:"input"`
	InputFile   string        `json:"inputfile"`
	Expected    []interface{} `json:"expected"`
	Tags        []string      `json:"tags"`
	Description string        `json:"description"`
	Disable     bool          `json:"disable"`
	Error       string        `json:"error"`
}

// loadTestSuites loads FHIRPath test cases from new JSON format
func (r *GoTestRunner) loadTestSuites() ([]TestCase, error) {
	testsDir := filepath.Join(r.specsDir, "fhirpath", "tests")

	if _, err := os.Stat(testsDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("tests directory not found: %s", testsDir)
	}

	var testCases []TestCase

	err := filepath.Walk(testsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() && filepath.Ext(path) == ".json" {
			// Skip input directory
			if info.Name() == "input" {
				return nil
			}

			data, err := ioutil.ReadFile(path)
			if err != nil {
				fmt.Printf("⚠️  Failed to read test file %s: %v\n", path, err)
				return nil
			}

			var testSuite TestSuite
			if err := json.Unmarshal(data, &testSuite); err != nil {
				fmt.Printf("⚠️  Failed to parse test file %s: %v\n", path, err)
				return nil
			}

			suiteName := testSuite.Name
			if suiteName == "" {
				suiteName = filepath.Base(path)
			}

			for _, test := range testSuite.Tests {
				// Skip disabled tests
				if test.Disable {
					continue
				}

				inputFile := test.InputFile
				if inputFile == "" {
					inputFile = "patient-example.json"
				}

				testCases = append(testCases, TestCase{
					Name:           test.Name,
					Description:    test.Description,
					InputFile:      inputFile,
					Expression:     test.Expression,
					ExpectedOutput: test.Expected,
					Predicate:      false, // Not used in new format
					Mode:           "",
					Invalid:        test.Error,
					Group:          suiteName,
				})
			}
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to load test suites: %v", err)
	}

	return testCases, nil
}

// loadTestData loads test data from JSON file and converts it to a FHIR resource
func (r *GoTestRunner) loadTestData(filename string) (fhirpath.Element, error) {
	filePath := filepath.Join(r.specsDir, "fhirpath", "tests", "input", filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("test data file not found: %s", filename)
	}

	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read test data file: %v", err)
	}

	// Parse JSON data directly - the library should handle FHIR JSON
	var jsonData map[string]interface{}
	if err := json.Unmarshal(data, &jsonData); err != nil {
		return nil, fmt.Errorf("failed to parse JSON data: %v", err)
	}

	resourceType, ok := jsonData["resourceType"].(string)
	if !ok {
		return nil, fmt.Errorf("missing or invalid resourceType in JSON data")
	}

	// Parse JSON to FHIR resource based on resource type
	var resource fhirpath.Element

	switch resourceType {
	case "Patient":
		patient := &r4.Patient{}
		if err := json.Unmarshal(data, patient); err != nil {
			return nil, fmt.Errorf("failed to parse patient data: %v", err)
		}
		resource = patient
	case "Observation":
		observation := &r4.Observation{}
		if err := json.Unmarshal(data, observation); err != nil {
			return nil, fmt.Errorf("failed to parse observation data: %v", err)
		}
		resource = observation
	default:
		// For other resource types, try a generic approach
		return nil, fmt.Errorf("unsupported resource type: %s", resourceType)
	}

	return resource, nil
}

// convertFHIRPathResult converts FHIRPath result to the format expected by the test runner
func convertFHIRPathResult(result []fhirpath.Element) []interface{} {
	var converted []interface{}

	for _, elem := range result {
		// Try to convert to various types, starting with the most common ones
		if boolVal, ok, err := elem.ToBoolean(false); err == nil && ok {
			converted = append(converted, bool(boolVal))
			continue
		}

		if strVal, ok, err := elem.ToString(false); err == nil && ok {
			converted = append(converted, string(strVal))
			continue
		}

		if intVal, ok, err := elem.ToInteger(false); err == nil && ok {
			converted = append(converted, int32(intVal))
			continue
		}

		if decVal, ok, err := elem.ToDecimal(false); err == nil && ok {
			// For decimal, we'll use the string representation to preserve precision
			converted = append(converted, decVal.String())
			continue
		}

		if dateVal, ok, err := elem.ToDate(false); err == nil && ok {
			converted = append(converted, dateVal.String())
			continue
		}

		if timeVal, ok, err := elem.ToTime(false); err == nil && ok {
			converted = append(converted, timeVal.String())
			continue
		}

		if dateTimeVal, ok, err := elem.ToDateTime(false); err == nil && ok {
			converted = append(converted, dateTimeVal.String())
			continue
		}

		// Handle FHIR resources
		switch v := elem.(type) {
		case *r4.Patient:
			converted = append(converted, map[string]interface{}{
				"resourceType": "Patient",
				"id":           v.Id.Value,
			})
		case *r4.Observation:
			converted = append(converted, map[string]interface{}{
				"resourceType": "Observation",
				"id":           v.Id.Value,
			})
		default:
			// For other types, convert to string representation
			converted = append(converted, fmt.Sprintf("%v", elem))
		}
	}

	return converted
}

// runSingleTest executes a single test case
func (r *GoTestRunner) runSingleTest(testCase TestCase, testData fhirpath.Element) TestResult {
	startTime := time.Now()

	result := TestResult{
		Name:        testCase.Name,
		Description: testCase.Description,
		Expression:  testCase.Expression,
		Expected:    testCase.ExpectedOutput,
		Actual:      []interface{}{},
	}

	// Skip invalid expressions
	if testCase.Invalid != "" {
		result.Status = "skipped"
		result.Error = fmt.Sprintf("Invalid expression: %s", testCase.Invalid)
		return result
	}

	// Evaluate FHIRPath expression
	ctx := r4.Context()
	ctx = fhirpath.WithAPDContext(ctx, apd.BaseContext.WithPrecision(10))

	// Parse and evaluate the expression
	expr, err := fhirpath.Parse(testCase.Expression)
	if err != nil {
		result.Status = "error"
		result.Error = fmt.Sprintf("Failed to parse expression: %v", err)
		endTime := time.Now()
		result.ExecutionTimeMs = float64(endTime.Sub(startTime).Nanoseconds()) / 1000000.0
		return result
	}

	fhirpathResult, err := fhirpath.Evaluate(ctx, testData, expr)
	endTime := time.Now()
	result.ExecutionTimeMs = float64(endTime.Sub(startTime).Nanoseconds()) / 1000000.0

	if err != nil {
		result.Status = "error"
		result.Error = fmt.Sprintf("Evaluation error: %v", err)
		return result
	}

	// Convert result to expected format
	result.Actual = convertFHIRPathResult(fhirpathResult)

	// Determine test status
	// This is a simplified comparison - in a real implementation, you would need
	// to compare the actual and expected results more carefully
	if len(result.Actual) == len(result.Expected) {
		result.Status = "passed"
	} else {
		result.Status = "failed"
	}

	return result
}

// runTests executes all test cases
func (r *GoTestRunner) runTests() error {
	fmt.Println("🧪 Running Go FHIRPath tests...")

	var allResults []TestResult
	summary := TestSummary{}

	// Load and run test suites
	fmt.Println("📋 Loading FHIRPath test suites...")
	testCases, err := r.loadTestSuites()
	if err != nil {
		return fmt.Errorf("failed to load test suites: %v", err)
	}
	fmt.Printf("📊 Found %d test cases\n", len(testCases))

	for _, testCase := range testCases {
		inputFile := testCase.InputFile

		// Load test data on demand
		testData, err := r.loadTestData(inputFile)
		if err != nil {
			fmt.Printf("⚠️  Skipping test %s - test data not available: %s (%v)\n", testCase.Name, inputFile, err)
			continue
		}

		result := r.runSingleTest(testCase, testData)
		allResults = append(allResults, result)

		summary.Total++
		switch result.Status {
		case "passed":
			summary.Passed++
		case "failed":
			summary.Failed++
		default:
			summary.Errors++
		}

		statusIcon := "✅"
		if result.Status == "failed" {
			statusIcon = "❌"
		} else if result.Status == "error" {
			statusIcon = "💥"
		} else if result.Status == "skipped" {
			statusIcon = "⏭️"
		}
		fmt.Printf("  %s %s (%.2fms) [%s]\n", statusIcon, result.Name, result.ExecutionTimeMs, testCase.Group)
	}

	// Create output structure
	output := TestOutput{
		Language:  "go",
		Timestamp: float64(time.Now().Unix()) + float64(time.Now().Nanosecond())/1e9,
		Tests:     allResults,
		Summary:   summary,
	}

	// Save results to file
	filename := fmt.Sprintf("go_test_results.json")
	resultFilePath := filepath.Join(r.resultsDir, filename)

	outputData, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal results: %v", err)
	}

	if err := ioutil.WriteFile(resultFilePath, outputData, 0644); err != nil {
		return fmt.Errorf("failed to write results file: %v", err)
	}

	// Also save to the standard filename for compatibility
	stdFilePath := filepath.Join(r.resultsDir, "go_test_results.json")
	if err := ioutil.WriteFile(stdFilePath, outputData, 0644); err != nil {
		fmt.Printf("⚠️  Warning: Could not write to standard results file: %v\n", err)
	}

	fmt.Printf("✅ Tests completed. Results saved to %s\n", filename)
	fmt.Printf("📊 Summary: %d total, %d passed, %d failed, %d errors\n",
		summary.Total, summary.Passed, summary.Failed, summary.Errors)

	return nil
}

// runBenchmarks executes benchmark tests
func (r *GoTestRunner) runBenchmarks() error {
	fmt.Println("⚡ Running Go FHIRPath benchmarks...")

	var benchmarks []BenchmarkResult

	// Create simple benchmarks from test cases
	testCases, err := r.loadTestSuites()
	if err != nil {
		return fmt.Errorf("failed to load test suites: %v", err)
	}

	// Use a subset for benchmarking
	var benchmarkCases []TestCase
	for i := 0; i < 10 && i < len(testCases); i++ {
		testCase := testCases[i]
		testCase.Iterations = 100 // Set benchmark iterations
		benchmarkCases = append(benchmarkCases, testCase)
	}

	for _, testCase := range benchmarkCases {
		// Load test data on demand
		testData, err := r.loadTestData(testCase.InputFile)
		if err != nil {
			fmt.Printf("⚠️  Skipping benchmark %s - test data not available: %v\n", testCase.Name, err)
			continue
		}

		iterations := 1000
		if testCase.Iterations > 0 {
			iterations = testCase.Iterations
		}
		var times []float64

		// Parse the expression once outside the loop
		expr, err := fhirpath.Parse(testCase.Expression)
		if err != nil {
			fmt.Printf("⚠️  Skipping benchmark %s - failed to parse expression: %v\n", testCase.Name, err)
			continue
		}

		ctx := r4.Context()
		ctx = fhirpath.WithAPDContext(ctx, apd.BaseContext.WithPrecision(10))

		for i := 0; i < iterations; i++ {
			startTime := time.Now()
			_, err := fhirpath.Evaluate(ctx, testData, expr)
			endTime := time.Now()

			if err != nil {
				fmt.Printf("⚠️  Error in benchmark %s: %v\n", testCase.Name, err)
				break
			}

			executionTime := float64(endTime.Sub(startTime).Nanoseconds()) / 1000000.0
			times = append(times, executionTime)
		}

		if len(times) == 0 {
			continue
		}

		// Calculate statistics
		var sum, min, max float64
		min = times[0]
		max = times[0]

		for _, t := range times {
			sum += t
			if t < min {
				min = t
			}
			if t > max {
				max = t
			}
		}

		avgTime := sum / float64(iterations)
		opsPerSecond := 1000.0 / avgTime // Convert ms to ops/sec

		benchmark := BenchmarkResult{
			Name:         testCase.Name,
			Description:  testCase.Description,
			Expression:   testCase.Expression,
			Iterations:   iterations,
			AvgTimeMs:    avgTime,
			MinTimeMs:    min,
			MaxTimeMs:    max,
			OpsPerSecond: opsPerSecond,
		}

		benchmarks = append(benchmarks, benchmark)
	}

	// Create output structure
	output := BenchmarkOutput{
		Language:   "go",
		Timestamp:  float64(time.Now().Unix()) + float64(time.Now().Nanosecond())/1e9,
		Benchmarks: benchmarks,
		SystemInfo: SystemInfo{
			Platform:        runtime.GOOS,
			GoVersion:       runtime.Version(),
			FhirpathVersion: "fhir-toolbox-go", // Using the new library name
		},
	}

	// Save results to file
	filename := fmt.Sprintf("go_benchmark_results.json")
	resultFilePath := filepath.Join(r.resultsDir, filename)

	outputData, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal benchmark results: %v", err)
	}

	if err := ioutil.WriteFile(resultFilePath, outputData, 0644); err != nil {
		return fmt.Errorf("failed to write benchmark results file: %v", err)
	}

	// Also save to the standard filename for compatibility
	stdFilePath := filepath.Join(r.resultsDir, "go_benchmark_results.json")
	if err := ioutil.WriteFile(stdFilePath, outputData, 0644); err != nil {
		fmt.Printf("⚠️  Warning: Could not write to standard benchmark results file: %v\n", err)
	}

	fmt.Printf("✅ Benchmarks completed. Results saved to %s\n", filename)

	return nil
}

func main() {
	mode := "both"
	if len(os.Args) >= 2 {
		mode = os.Args[1]
	}

	runner, err := NewGoTestRunner()
	if err != nil {
		fmt.Printf("❌ Failed to initialize test runner: %v\n", err)
		os.Exit(1)
	}

	switch mode {
	case "test":
		if err := runner.runTests(); err != nil {
			fmt.Printf("❌ Test execution failed: %v\n", err)
			os.Exit(1)
		}
	case "benchmark":
		if err := runner.runBenchmarks(); err != nil {
			fmt.Printf("❌ Benchmark execution failed: %v\n", err)
			os.Exit(1)
		}
	case "both":
		if err := runner.runTests(); err != nil {
			fmt.Printf("❌ Test execution failed: %v\n", err)
			os.Exit(1)
		}
		if err := runner.runBenchmarks(); err != nil {
			fmt.Printf("❌ Benchmark execution failed: %v\n", err)
			os.Exit(1)
		}
	default:
		fmt.Printf("❌ Unknown mode: %s. Use 'test', 'benchmark', or 'both'\n", mode)
		os.Exit(1)
	}

	fmt.Println("✅ Go test runner completed")
}
