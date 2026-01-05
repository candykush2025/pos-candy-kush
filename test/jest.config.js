module.exports = {
  rootDir: "../",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.js", "<rootDir>/test/**/*.spec.js"],
  collectCoverageFrom: [
    "src/app/api/**/*.js",
    "!src/app/api/**/_*.js",
    "!**/node_modules/**",
  ],
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transformIgnorePatterns: ["node_modules/(?!(date-fns)/)"],
};
