/**
 * jest.config.js
 *
 * Jest configuration for ES module support (since package.json has "type": "module").
 */

export default {
  testEnvironment: 'node',
  transform: {},                // No transform needed — native ESM
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/scripts/'],
  // Inject stub env vars BEFORE any module (including env.js) is loaded
  setupFiles: ['./jest.setup.js'],
};
