(ns test-runner
  "Clojure FHIRPath Test Runner

  This script runs FHIRPath tests using the fhirpath.clj library
  and outputs results in a standardized format for comparison."
  (:require [clojure.data.json :as json]
            [clojure.java.io :as io]
            [clojure.string :as str]
            [fhirpath.core :as fp])
  (:import [java.time Instant]
           [java.io File]))

(defn current-timestamp []
  (.toString (Instant/now)))

(defn load-test-suites []
  "Load FHIRPath test cases from new JSON format"
  (let [tests-dir (io/file "../../specs/fhirpath/tests")
        tests (atom [])]
    (when (.exists tests-dir)
      (doseq [json-file (.listFiles tests-dir)
              :when (and (.isFile json-file)
                        (.endsWith (.getName json-file) ".json"))]
        (try
          (let [test-suite (json/read-str (slurp json-file) :key-fn keyword)
                suite-name (or (:name test-suite) (str/replace (.getName json-file) ".json" ""))
                test-cases (:tests test-suite [])]
            (doseq [test-case test-cases
                    :when (not (:disable test-case))]
              (let [input-file (or (:inputfile test-case) "patient-example.json")]
                (swap! tests conj {
                  :name (:name test-case)
                  :description (or (:description test-case) (:name test-case))
                  :inputFile input-file
                  :expression (:expression test-case)
                  :expectedOutput (or (:expected test-case) [])
                  :predicate false
                  :mode nil
                  :invalid (some? (:error test-case))
                  :group suite-name
                  :tags (or (:tags test-case) [])
                }))))
          (catch Exception e
            (println (str "⚠️  Failed to load test file " (.getName json-file) ": " (.getMessage e)))))))
    @tests))

(defn load-test-data [filename]
  "Load test data from JSON file"
  (let [file-path (io/file (str "../../specs/fhirpath/tests/input/" filename))]
    (when (.exists file-path)
      (try
        (let [json-content (slurp file-path)
              parsed-json (json/read-str json-content :key-fn keyword)]
          parsed-json)
        (catch Exception e
          (println (str "⚠️  Error loading test data " filename ": " (.getMessage e)))
          nil)))))

(defn safe-serialize [obj]
  "Safely serialize objects to JSON-compatible format"
  (try
    (cond
      (nil? obj) nil
      (string? obj) obj
      (number? obj) obj
      (boolean? obj) obj
      (keyword? obj) (name obj)
      (sequential? obj) (mapv safe-serialize obj)
      (map? obj) (into {} (map (fn [[k v]] [(safe-serialize k) (safe-serialize v)]) obj))
      :else (str obj))
    (catch Exception e
      (str "<non-serializable: " (type obj) ">"))))

(defn run-single-test [test test-data]
  "Run a single FHIRPath test case"
  (let [start-time (System/nanoTime)]
    (try
      (let [result (fp/fp (:expression test) test-data)
            end-time (System/nanoTime)
            execution-time-ms (/ (- end-time start-time) 1000000.0)
            serialized-result (safe-serialize result)]

        {:name (:name test)
         :expression (:expression test)
         :result serialized-result
         :expected (:expectedOutput test)
         :success true
         :executionTimeMs execution-time-ms
         :error nil})

      (catch Exception e
        (let [end-time (System/nanoTime)
              execution-time-ms (/ (- end-time start-time) 1000000.0)]
          {:name (:name test)
           :expression (:expression test)
           :result nil
           :expected (:expectedOutput test)
           :success false
           :executionTimeMs execution-time-ms
           :error (.getMessage e)})))))

(defn run-tests []
  "Run all FHIRPath tests and return results"
  (println "🧪 Running Clojure FHIRPath tests...")

  (let [tests (load-test-suites)
        start-time (current-timestamp)]

    (println (str "📋 Loaded " (count tests) " test cases"))

    (let [results (for [test tests
                       :let [input-file (:inputFile test)
                             test-data (cond
                                       (nil? input-file) {} ; No input file needed
                                       :else (load-test-data input-file))]
                       :when (or (nil? (:inputFile test)) test-data)] ; Skip only if input file specified but failed to load
                   (do
                     (print (str "  Running: " (:name test) "... "))
                     (flush)
                     (let [result (run-single-test test test-data)]
                       (println (if (:success result) "✅" "❌"))
                       result)))

          end-time (current-timestamp)
          successful-tests (count (filter :success results))
          total-tests (count results)
          success-rate (if (> total-tests 0) (double (/ successful-tests total-tests)) 0.0)]

      (println (str "\n📊 Results: " successful-tests "/" total-tests
                   " tests passed (" (format "%.1f" (* success-rate 100)) "%)"))

      {:language "clojure"
       :timestamp end-time
       :tests results
       :summary {:total total-tests
                 :passed successful-tests
                 :failed (- total-tests successful-tests)
                 :errors 0}})))

(defn save-results [results]
  "Save test results to JSON file"
  (let [filename "../../results/clojure_test_results.json"]
    (try
      (spit filename (json/write-str results :indent true))
      (println (str "💾 Results saved to: " filename))
      (catch Exception e
        (println (str "❌ Error saving results: " (.getMessage e)))))))

(defn run-benchmarks []
  "Run benchmarks and return results"
  (println "⚡ Running Clojure FHIRPath benchmarks...")

  (let [test-cases (load-test-suites)
        benchmark-tests (take 10 test-cases)] ; Use first 10 test cases for benchmarking

    (if (empty? benchmark-tests)
      (do
        (println "⚠️  No benchmark tests found in configuration")
        {:language "clojure"
         :timestamp (.toString (Instant/now))
         :benchmarks []
         :system_info {:platform (System/getProperty "os.name")
                       :java_version (System/getProperty "java.version")
                       :clojure_version (clojure-version)
                       :fhirpath_version "fhirpath.clj"}})

      (let [results {:language "clojure"
                     :timestamp (.toString (Instant/now))
                     :benchmarks []
                     :system_info {:platform (System/getProperty "os.name")
                                   :java_version (System/getProperty "java.version")
                                   :clojure_version (clojure-version)
                                   :fhirpath_version "fhirpath.clj"}}

            test-data-cache {}] ; We'll load test data on demand

        (println (str "📋 Running " (count benchmark-tests) " benchmark tests"))

        (let [benchmark-results
              (for [benchmark benchmark-tests
                    :let [input-file (get benchmark :inputFile "patient-example.json")
                          test-data (load-test-data input-file)]]
                (if (nil? test-data)
                  (do
                    (println (str "⚠️  Skipping benchmark " (:name benchmark) " - test data not available"))
                    nil)
                  (do
                    (println (str "  🏃 Running " (:name benchmark) "..."))
                    (let [iterations (get benchmark :iterations 1000)
                          expression (:expression benchmark)

                          ;; Warm up
                          _ (dotimes [_ 10]
                              (try
                                (fp/fp expression test-data)
                                (catch Exception e nil)))

                          ;; Actual benchmark
                          times (for [_ (range iterations)]
                                  (let [start-time (System/nanoTime)]
                                    (try
                                      (fp/fp expression test-data)
                                      (catch Exception e nil))
                                    (let [end-time (System/nanoTime)]
                                      (/ (- end-time start-time) 1000000.0))))

                          valid-times (filter pos? times)
                          avg-time (if (seq valid-times) (/ (reduce + valid-times) (count valid-times)) 0.0)
                          min-time (if (seq valid-times) (apply min valid-times) 0.0)
                          max-time (if (seq valid-times) (apply max valid-times) 0.0)
                          ops-per-second (if (> avg-time 0) (/ 1000.0 avg-time) 0.0)]

                      (println (str "    ⏱️  " (format "%.2f" avg-time) "ms avg ("
                                   (format "%.1f" ops-per-second) " ops/sec)"))

                      {:name (:name benchmark)
                       :description (:description benchmark)
                       :expression expression
                       :iterations iterations
                       :avg_time_ms avg-time
                       :min_time_ms min-time
                       :max_time_ms max-time
                       :ops_per_second ops-per-second}))))

              valid-results (filter some? benchmark-results)
              final-results (assoc results :benchmarks valid-results)]

          ;; Save benchmark results
          (let [filename "../../results/clojure_benchmark_results.json"]
            (try
              (spit filename (json/write-str final-results :indent true))
              (println (str "📊 Benchmark results saved to: " filename))
              (catch Exception e
                (println (str "❌ Error saving benchmark results: " (.getMessage e))))))

          final-results)))))

(defn -main [& args]
  "Main entry point for the test runner"
  (println "🚀 Starting Clojure FHIRPath Test Runner")
  (println "=====================================")

  (let [command (if (seq args) (first args) "both")]

    (try
      (when (or (= command "test") (= command "both"))
        (let [results (run-tests)]
          (save-results results)))

      (when (or (= command "benchmark") (= command "both"))
        (run-benchmarks))

      (println "\n✅ Clojure test runner completed successfully")

      (catch Exception e
        (println (str "\n❌ Test runner failed: " (.getMessage e)))
        (System/exit 1)))))

;; Allow running as script
(when (= *file* (first *command-line-args*))
  (-main))
