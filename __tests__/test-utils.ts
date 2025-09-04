import { vi } from 'vitest'

// Mock word list for testing
export const mockWordList = [
  'test', 'word', 'example', 'hello', 'world', 'game', 'play', 
  'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
  'computer', 'science', 'technology', 'programming', 'javascript',
  'typescript', 'react', 'nextjs', 'testing', 'vitest'
]

// Mock AI responses for testing
export const mockAIResponses = {
  'computer': 'A computer is an electronic device that processes data and performs calculations.',
  'science': 'Science is the systematic study of the natural world through observation and experimentation.',
  'technology': 'Technology refers to the application of scientific knowledge for practical purposes.',
  'taboo': 'This is a taboo word that should be avoided in responses.'
}

// Mock game data
export const mockGameData = {
  targetWords: ['computer', 'science', 'technology', 'programming', 'javascript'],
  tabooWord: 'taboo',
  gameDate: '2025-01-01'
}

// Reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks()
}