#!/usr/bin/env node

/**
 * Mobile API Test Runner
 * Runs integration tests against the actual Next.js development server
 */

const { spawn } = require("child_process");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const TEST_PORT = 3001;

console.log("🚀 Starting Mobile API Integration Tests...\n");

// Start the Next.js development server
console.log("📡 Starting Next.js development server on port", TEST_PORT);
const server = spawn("npm", ["run", "dev", "--", "-p", TEST_PORT.toString()], {
  cwd: ROOT_DIR,
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

// Wait for server to start
let serverReady = false;
let serverOutput = "";

server.stdout.on("data", (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log("📡 Server:", output.trim());

  // Check if server is ready
  if (
    output.includes("Ready") ||
    output.includes("started server") ||
    output.includes(`http://localhost:${TEST_PORT}`)
  ) {
    serverReady = true;
  }
});

server.stderr.on("data", (data) => {
  console.log("📡 Server Error:", data.toString().trim());
});

// Wait for server to be ready, then run tests
const waitForServer = () => {
  return new Promise((resolve, reject) => {
    const checkServer = () => {
      if (serverReady) {
        console.log("\n✅ Server is ready! Running integration tests...\n");
        resolve();
      } else if (
        serverOutput.includes("Error") ||
        serverOutput.includes("Failed")
      ) {
        reject(new Error("Server failed to start"));
      } else {
        setTimeout(checkServer, 1000);
      }
    };
    checkServer();
  });
};

// Run the integration tests
const runTests = () => {
  return new Promise((resolve, reject) => {
    console.log("🧪 Running integration tests...\n");

    const testProcess = spawn(
      "npx",
      ["jest", "test/mobile-api.integration.test.js", "--verbose"],
      {
        cwd: ROOT_DIR,
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          TEST_BASE_URL: `http://localhost:${TEST_PORT}`,
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
    await waitForServer();
    await runTests();

    console.log("\n🎉 Mobile API integration tests completed successfully!");
    console.log("📋 Summary:");
    console.log("   - Server started on port", TEST_PORT);
    console.log("   - All endpoints tested");
    console.log("   - CORS headers validated");
    console.log("   - Data structures verified");
    console.log("   - Error handling confirmed");
  } catch (error) {
    console.error("\n💥 Integration tests failed:", error.message);
    process.exit(1);
  } finally {
    // Clean up: stop the server
    console.log("\n🛑 Stopping development server...");
    server.kill("SIGTERM");

    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
};

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down...");
  server.kill("SIGTERM");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down...");
  server.kill("SIGTERM");
  process.exit(0);
});

// Start the integration tests
runIntegrationTests();
