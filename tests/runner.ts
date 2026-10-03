import { suite as authSuite } from "./auth.test";
import { suite as sanitizerSuite } from "./sanitizer.test";
import { suite as analyzerSuite } from "./analyzer.test";
import { suite as exportSuite } from "./export.test";
import { suite as resilienceSuite } from "./resilience.test";
import { suite as rateLimiterSuite } from "./rate-limiter.test";
import { TestSuite } from "./test-utils";

const allSuites: TestSuite[] = [
  authSuite,
  sanitizerSuite,
  analyzerSuite,
  exportSuite,
  resilienceSuite,
  rateLimiterSuite,
];

async function runAllTests() {
  console.log("\n========================================================");
  console.log("  AI Content Studio — Automated Test Runner");
  console.log("========================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const startTime = Date.now();

  for (const suite of allSuites) {
    console.log(`\x1b[1m\x1b[36m▶ Suite: ${suite.name}\x1b[0m`);

    for (const t of suite.tests) {
      totalTests++;
      const testStart = Date.now();
      try {
        await t.fn();
        const testDuration = Date.now() - testStart;
        console.log(`  \x1b[32m✔\x1b[0m ${t.description} \x1b[90m(${testDuration}ms)\x1b[0m`);
        passedTests++;
      } catch (err: unknown) {
        const testDuration = Date.now() - testStart;
        console.log(`  \x1b[31m✖\x1b[0m ${t.description} \x1b[90m(${testDuration}ms)\x1b[0m`);
        if (err instanceof Error) {
          console.log(`    \x1b[31mError:\x1b[0m ${err.message}`);
          if (err.stack) {
            const stackLines = err.stack.split("\n").slice(1, 3).join("\n");
            console.log(`    \x1b[90m${stackLines}\x1b[0m`);
          }
        } else {
          console.log(`    \x1b[31mError:\x1b[0m`, err);
        }
        failedTests++;
      }
    }
    console.log();
  }

  const totalDuration = Date.now() - startTime;
  console.log("--------------------------------------------------------");
  if (failedTests === 0) {
    console.log(
      `\x1b[32m\x1b[1mALL TESTS PASSED!\x1b[0m \x1b[32m(${passedTests}/${totalTests} passed)\x1b[0m in ${totalDuration}ms`
    );
    console.log("========================================================\n");
    process.exit(0);
  } else {
    console.log(
      `\x1b[31m\x1b[1mTESTS FAILED!\x1b[0m \x1b[31m(${failedTests} failed, ${passedTests} passed)\x1b[0m in ${totalDuration}ms`
    );
    console.log("========================================================\n");
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error("Fatal runner crash:", e);
  process.exit(1);
});
