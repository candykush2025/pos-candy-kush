#!/usr/bin/env node

/**
 * Mobile API Test Runner
 * Runs integration tests against the deployed production API
 */

const { spawn } = require("child_process");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEPLOYED_URL = "https://pos-candy-kush.vercel.app";

console.log("🚀 Starting Mobile API Integration Tests...\n");
console.log("📡 Testing against deployed API:", DEPLOYED_URL);
console.log("⏳ Running integration tests...\n");

// Run the integration tests directly against deployed API
const runTests = () => {
  return new Promise((resolve, reject) => {
    const testProcess = spawn(
      "npx",
      [
        "jest",
        "--config",
        "test/jest.integration.config.js",
        "test/mobile-api.integration.test.js",
        "--verbose",
      ],
      {
        cwd: ROOT_DIR,
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          TEST_BASE_URL: DEPLOYED_URL,
        },
      }
    );

    testProcess.on("close", (code) => {
      if (code === 0) {
        console.log("\n✅ All integration tests passed!");
        resolve();
      } else {
        console.log(`\n❌ Integration tests failed with exit code ${code}`);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });

    testProcess.on("error", (error) => {
      console.error("❌ Error running tests:", error);
      reject(error);
    });
  });
};

// Main execution flow
const runIntegrationTests = async () => {
  try {
    await runTests();

    console.log("\n🎉 Mobile API integration tests completed successfully!");
    console.log("📋 Summary:");
    console.log("   - Testing against deployed API:", DEPLOYED_URL);
    console.log("   - All endpoints tested");
    console.log("   - CORS headers validated");
    console.log("   - Data structures verified");
    console.log("   - Error handling confirmed");
  } catch (error) {
    console.error("\n💥 Integration tests failed:", error.message);
    process.exit(1);
  }
};

// Start the integration tests
runIntegrationTests();
