import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockWordList, mockAIResponses, resetMocks } from './test-utils'

// Mock external dependencies BEFORE importing utils
vi.mock('word-list-json', () => ({
  default: mockWordList
}))

vi.mock('./data/words', () => ({
  allTargetWords: ['test', 'word', 'example', 'computer', 'science'],
  allTargetWordsV2: ['technology', 'programming', 'javascript', 'react', 'nextjs']
}))

import {
  getGameData,
  calculateScore,
  isValidWord,
  isDerivative,
  getLemmas,
  processAIResponse,
  getMostFrequentLemmas,
  BASE_SCORE_CONSTANT,
  PENALTY_PER_TABOO_HIT_CONSTANT
} from '../utils'

// NLP mocks are now in test-setup.ts

describe('Core Utility Functions', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('getGameData', () => {
    it('should return consistent game data for the same date', () => {
      const date = new Date('2025-01-01')
      const gameData1 = getGameData(date, 'v2')
      const gameData2 = getGameData(date, 'v2')
      
      expect(gameData1).toEqual(gameData2)
      expect(gameData1.gameDate).toBe('2025-01-01')
      expect(gameData1.targetWords).toHaveLength(5)
      expect(gameData1.tabooWord).toBeTruthy()
    })

    it('should return different game data for different dates', () => {
      const date1 = new Date('2025-01-01')
      const date2 = new Date('2025-01-02')
      
      const gameData1 = getGameData(date1, 'v2')
      const gameData2 = getGameData(date2, 'v2')
      
      expect(gameData1.targetWords).not.toEqual(gameData2.targetWords)
      expect(gameData1.tabooWord).not.toBe(gameData2.tabooWord)
    })

    it('should return different game data for different variants', () => {
      const date = new Date('2025-01-01')
      const gameDataV1 = getGameData(date, 'v1')
      const gameDataV2 = getGameData(date, 'v2')
      
      expect(gameDataV1.targetWords).not.toEqual(gameDataV2.targetWords)
    })
  })

  describe('calculateScore', () => {
    it('should return base score with no prompts', () => {
      const score = calculateScore([], {}, {}, {})
      expect(score).toBe(BASE_SCORE_CONSTANT)
    })

    it('should deduct points for taboo hits', () => {
      const prompts = ['test']
      const tabooWordIndices = { 'test': [0] }
      const matchedWords = {}
      const bonusPoints = {}
      
      const score = calculateScore(prompts, tabooWordIndices, matchedWords, bonusPoints)
      expect(score).toBe(BASE_SCORE_CONSTANT - PENALTY_PER_TABOO_HIT_CONSTANT)
    })

    it('should deduct points for wasted prompts', () => {
      const prompts = ['test']
      const tabooWordIndices = {}
      const matchedWords = {}
      const bonusPoints = {}
      
      const score = calculateScore(prompts, tabooWordIndices, matchedWords, bonusPoints)
      expect(score).toBe(BASE_SCORE_CONSTANT - 5) // PENALTY_PER_WASTED_PROMPT
    })

    it('should add bonus points', () => {
      const prompts = ['test']
      const tabooWordIndices = {}
      const matchedWords = { 'test': ['computer'] }
      const bonusPoints = { 'test': 10 }
      
      const score = calculateScore(prompts, tabooWordIndices, matchedWords, bonusPoints)
      expect(score).toBe(BASE_SCORE_CONSTANT + 10)
    })

    it('should never return negative scores', () => {
      const prompts = Array(20).fill('test')
      const tabooWordIndices = prompts.reduce((acc, prompt, i) => ({ ...acc, [`test${i}`]: [0] }), {})
      const matchedWords = {}
      const bonusPoints = {}
      
      const score = calculateScore(prompts, tabooWordIndices, matchedWords, bonusPoints)
      expect(score).toBe(0)
    })
  })

  describe('isValidWord', () => {
    it('should return true for words in the word list', () => {
      expect(isValidWord('test')).toBe(true)
      expect(isValidWord('word')).toBe(true)
    })

    it('should return false for words not in the word list', () => {
      expect(isValidWord('nonexistentword')).toBe(false)
      expect(isValidWord('xyz')).toBe(false)
    })

    it('should handle case insensitivity', () => {
      expect(isValidWord('TEST')).toBe(true)
      expect(isValidWord('Word')).toBe(true)
    })

    it('should handle echo prefix', () => {
      expect(isValidWord('echo')).toBe(true)
      expect(isValidWord('echotest')).toBe(true)
    })
  })

  describe('isDerivative', () => {
    it('should return true for derivative words', () => {
      const targetWords = ['test', 'word']
      expect(isDerivative('testing', targetWords)).toBe(true)
      expect(isDerivative('tests', targetWords)).toBe(true)
    })

    it('should return false for non-derivative words', () => {
      const targetWords = ['test', 'word']
      expect(isDerivative('hello', targetWords)).toBe(false)
      expect(isDerivative('computer', targetWords)).toBe(false)
    })

    it('should handle empty target words', () => {
      expect(isDerivative('test', [])).toBe(false)
    })
  })

  describe('getLemmas', () => {
    it('should return lemmas for a word', () => {
      const lemmas = getLemmas('testing')
      expect(lemmas).toBeInstanceOf(Set)
      expect(lemmas.has('testing')).toBe(true)
      expect(lemmas.size).toBeGreaterThan(1)
    })

    it('should handle words ending in ly', () => {
      const lemmas = getLemmas('quickly')
      expect(lemmas).toBeInstanceOf(Set)
      expect(lemmas.has('quickly')).toBe(true)
    })

    it('should cache results', () => {
      const lemmas1 = getLemmas('test')
      const lemmas2 = getLemmas('test')
      expect(lemmas1).toBe(lemmas2) // Same reference due to caching
    })
  })

  describe('processAIResponse', () => {
    it('should identify matched words in easy mode', () => {
      const aiResponse = 'This is about computer science and technology.'
      const targetWords = ['computer', 'science', 'technology']
      const tabooWord = 'taboo'
      
      const result = processAIResponse(aiResponse, targetWords, tabooWord, true)
      
      expect(result.matchedWords).toEqual(expect.arrayContaining(['computer', 'science', 'technology']))
      expect(result.tabooWordIndices).toHaveLength(0)
    })

    it('should identify taboo words', () => {
      const aiResponse = 'This contains the taboo word.'
      const targetWords = ['computer', 'science']
      const tabooWord = 'taboo'
      
      const result = processAIResponse(aiResponse, targetWords, tabooWord, true)
      
      expect(result.tabooWordIndices).toHaveLength(1)
      expect(result.matchedWords).toHaveLength(0)
    })

    it('should work in hard mode', () => {
      const aiResponse = 'This is about computer science.'
      const targetWords = ['computer', 'science']
      const tabooWord = 'taboo'
      
      const result = processAIResponse(aiResponse, targetWords, tabooWord, false)
      
      expect(result.matchedWords).toEqual(expect.arrayContaining(['computer', 'science']))
    })
  })

  describe('getMostFrequentLemmas', () => {
    it('should return frequent lemmas excluding taboo and excluded words', () => {
      const tabooResponse = 'This contains taboo words like something and specific.'
      const targetResponses = {
        'computer': 'A computer is a device for processing data.',
        'science': 'Science involves systematic study and research.'
      }
      
      const result = getMostFrequentLemmas(tabooResponse, targetResponses)
      
      expect(result).toBeTypeOf('object')
      // Should exclude 'something' and 'specific' (our newly added excluded words)
      expect(Object.keys(result)).not.toContain('something')
      expect(Object.keys(result)).not.toContain('specific')
    })

    it('should handle empty responses', () => {
      const result = getMostFrequentLemmas('', {})
      expect(result).toEqual({})
    })

    it('should prioritize lemmas that appear in multiple target responses', () => {
      const tabooResponse = 'Taboo content here.'
      const targetResponses = {
        'computer': 'Device used for processing and computing tasks.',
        'technology': 'Advanced computing and processing systems.'
      }
      
      const result = getMostFrequentLemmas(tabooResponse, targetResponses)
      
      // 'processing' appears in both responses, should be prioritized
      if (Object.keys(result).length > 0) {
        const firstLemma = Object.keys(result)[0]
        expect(result[firstLemma]).toHaveLength(2) // Should appear in both target words
      }
    })
  })
})