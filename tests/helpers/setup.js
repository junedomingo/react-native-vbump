import { jest } from '@jest/globals';

// Mock inquirer to avoid hanging tests
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

// Suppress console.log during tests unless explicitly testing it
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset console mocks
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore original console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities
global.mockConsole = {
  log: () => console.log,
  warn: () => console.warn,
  error: () => console.error,
};
