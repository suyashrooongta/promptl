# Testing Guide for Promptl

## Test Setup

This project uses **Vitest** as the testing framework with the following configuration:

- **Testing Framework**: Vitest v3.2.4
- **Test Environment**: jsdom (for browser-like environment)
- **Global Test Functions**: Available without imports
- **Mocking**: Comprehensive mocks for external dependencies

## Available Test Scripts

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once and exit
npm run test:run

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Test Files

- **`__tests__/utils.test.ts`**: Core utility functions (24 tests)
  - Game data generation and consistency
  - Scoring calculations
  - Word validation and derivative checking
  - Lemmatization and word processing
  - AI response processing

- **`__tests__/game-logic.test.ts`**: Game logic functions (15 tests)
  - Word matching in AI responses
  - Taboo word detection
  - Target word matching logic
  - Echo command handling
  - Match tracking and indices

- **`__tests__/state-management.test.ts`**: State persistence (14 tests)
  - Game state save/load functionality
  - Player statistics tracking
  - LocalStorage interactions
  - Time tracking and streak calculations

### Test Coverage

The test suite covers:

- **Core Game Mechanics**: Word generation, scoring, validation
- **NLP Processing**: Lemmatization, stemming, word matching
- **State Management**: Game persistence, statistics tracking
- **Edge Cases**: Empty inputs, invalid data, boundary conditions
- **Mocked Dependencies**: External libraries and APIs

## Key Features Tested

### Word Processing
- ✅ Lemmatization with multiple NLP libraries
- ✅ Derivative word detection
- ✅ Word validation against dictionary
- ✅ Echo command handling

### Game Logic
- ✅ Daily word generation (deterministic)
- ✅ Scoring with penalties and bonuses
- ✅ Target word matching in AI responses
- ✅ Taboo word detection and penalties

### State Management
- ✅ Game state persistence across sessions
- ✅ Statistics tracking (wins, streaks, scores)
- ✅ Time tracking and calculation
- ✅ Date-based game validation

### New Exclusion Words
- ✅ Tests verify that "something", "specific", and "involve" are properly excluded from frequent lemmas

## Test Utilities

The `__tests__/test-utils.ts` file provides:
- Mock word lists for consistent testing
- Mock AI responses
- Test data fixtures
- Utility functions for test setup

## Mocked Dependencies

All external dependencies are properly mocked:
- `word-list-json`: Mock English word dictionary
- `wink-lemmatizer`: Mock lemmatization functions
- `stemmer`: Mock word stemming
- `compromise`: Mock NLP processing
- `axios`: Mock HTTP requests
- `localStorage`: Mock browser storage

## Running Tests

1. **Development**: Run `npm test` for watch mode during development
2. **CI/Production**: Use `npm run test:run` for single execution
3. **Debugging**: Use `npm run test:ui` for visual test interface
4. **Coverage**: Use `npm run test:coverage` to generate coverage reports

## Test Results

✅ **53/53 tests passing**
- 24 core utility tests
- 15 game logic tests  
- 14 state management tests

All tests validate the recent changes including the new excluded words in the getMostFrequentLemmas function.