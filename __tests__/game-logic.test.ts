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

// Mock axios for fetchAIResponse
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

import {
  checkWordInAIResponses,
  processWord,
  addMatch,
  preprocessTargetWords,
  checkAIResponse,
  fetchAIResponse
} from '../utils'

// NLP mocks are now in test-setup.ts

describe('Game Logic Functions', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('checkWordInAIResponses', () => {
    it('should detect matches in target word responses', () => {
      const inputWord = 'device'
      const targetWordResponses = {
        'computer': 'A computer is an electronic device that processes data.',
        'phone': 'A phone is a communication device used for calls.'
      }
      const tabooResponse = 'This is about forbidden topics.'

      const result = checkWordInAIResponses(inputWord, targetWordResponses, tabooResponse)

      expect(result.matchedWords).toEqual(['computer', 'phone'])
      expect(result.tabooHit).toBe(false)
      expect(result.matchedIndices).toHaveProperty('computer')
      expect(result.matchedIndices).toHaveProperty('phone')
      expect(result.bonusPoints).toBe(5) // (2-1) * 5 for multiple matches
    })

    it('should detect taboo word hits', () => {
      const inputWord = 'forbidden'
      const targetWordResponses = {
        'computer': 'A computer is an electronic device.',
      }
      const tabooResponse = 'This contains forbidden content.'

      const result = checkWordInAIResponses(inputWord, targetWordResponses, tabooResponse)

      expect(result.matchedWords).toEqual([])
      expect(result.tabooHit).toBe(true)
      expect(result.tabooWordIndices).toHaveLength(1)
      expect(result.bonusPoints).toBe(0)
    })

    it('should handle echo prefix', () => {
      const inputWord = 'echo device'
      const targetWordResponses = {
        'computer': 'A computer is an electronic device.',
      }
      const tabooResponse = 'Safe content here.'

      const result = checkWordInAIResponses(inputWord, targetWordResponses, tabooResponse)

      expect(result.matchedWords).toEqual(['computer'])
      expect(result.tabooHit).toBe(false)
    })

    it('should handle no matches', () => {
      const inputWord = 'unrelated'
      const targetWordResponses = {
        'computer': 'A computer is an electronic device.',
      }
      const tabooResponse = 'Safe content here.'

      const result = checkWordInAIResponses(inputWord, targetWordResponses, tabooResponse)

      expect(result.matchedWords).toEqual([])
      expect(result.tabooHit).toBe(false)
      expect(result.bonusPoints).toBe(0)
    })
  })

  describe('processWord', () => {
    it('should detect taboo word matches', () => {
      const cleanWord = 'taboo'
      const tabooWord = 'taboo'
      const wordLemmas = new Set(['taboo'])
      const targetWords = ['computer', 'science']
      const targetWordLemmasMap = new Map([
        ['computer', new Set(['computer'])],
        ['science', new Set(['science'])]
      ])
      const matchedWords: string[] = []
      const matchedWordIndices: { [key: string]: number[] } = {}

      const isTaboo = processWord(
        cleanWord,
        tabooWord,
        wordLemmas,
        targetWords,
        targetWordLemmasMap,
        true,
        matchedWords,
        matchedWordIndices,
        0
      )

      expect(isTaboo).toBe(true)
      expect(matchedWords).toHaveLength(0)
    })

    it('should detect target word matches in easy mode', () => {
      const cleanWord = 'computer'
      const tabooWord = 'taboo'
      const wordLemmas = new Set(['computer'])
      const targetWords = ['computer', 'science']
      const targetWordLemmasMap = new Map([
        ['computer', new Set(['computer'])],
        ['science', new Set(['science'])]
      ])
      const matchedWords: string[] = []
      const matchedWordIndices: { [key: string]: number[] } = {}

      const isTaboo = processWord(
        cleanWord,
        tabooWord,
        wordLemmas,
        targetWords,
        targetWordLemmasMap,
        true,
        matchedWords,
        matchedWordIndices,
        0
      )

      expect(isTaboo).toBe(false)
      expect(matchedWords).toContain('computer')
      expect(matchedWordIndices).toHaveProperty('computer')
      expect(matchedWordIndices['computer']).toContain(0)
    })

    it('should be more restrictive in hard mode', () => {
      const cleanWord = 'computing' // derivative of computer
      const tabooWord = 'taboo'
      const wordLemmas = new Set(['computing', 'compute'])
      const targetWords = ['computer']
      const targetWordLemmasMap = new Map([
        ['computer', new Set(['computer'])]
      ])
      const matchedWords: string[] = []
      const matchedWordIndices: { [key: string]: number[] } = {}

      // In hard mode, should require exact match
      const isTaboo = processWord(
        cleanWord,
        tabooWord,
        wordLemmas,
        targetWords,
        targetWordLemmasMap,
        false,
        matchedWords,
        matchedWordIndices,
        0
      )

      expect(isTaboo).toBe(false)
      expect(matchedWords).toHaveLength(0) // No match in hard mode for non-exact word
    })

    it('should match partial words with 6+ character prefix in easy mode', () => {
      const cleanWord = 'computers'
      const tabooWord = 'taboo'
      const wordLemmas = new Set(['computers', 'computer'])
      const targetWords = ['computer']
      const targetWordLemmasMap = new Map([
        ['computer', new Set(['computer'])]
      ])
      const matchedWords: string[] = []
      const matchedWordIndices: { [key: string]: number[] } = {}

      const isTaboo = processWord(
        cleanWord,
        tabooWord,
        wordLemmas,
        targetWords,
        targetWordLemmasMap,
        true,
        matchedWords,
        matchedWordIndices,
        0
      )

      expect(isTaboo).toBe(false)
      expect(matchedWords).toContain('computer')
    })
  })

  describe('addMatch', () => {
    it('should add new matches correctly', () => {
      const matchedWords: string[] = []
      const matchedWordIndices: { [key: string]: number[] } = {}
      const target = 'computer'
      const index = 5

      addMatch(matchedWords, target, matchedWordIndices, index)

      expect(matchedWords).toContain(target)
      expect(matchedWordIndices[target]).toEqual([index])
    })

    it('should not duplicate words but should add indices', () => {
      const matchedWords = ['computer']
      const matchedWordIndices = { 'computer': [2] }
      const target = 'computer'
      const index = 7

      addMatch(matchedWords, target, matchedWordIndices, index)

      expect(matchedWords).toEqual(['computer']) // No duplicate
      expect(matchedWordIndices[target]).toEqual([2, 7]) // Index added
    })

    it('should handle multiple different targets', () => {
      const matchedWords: string[] = []
      const matchedWordIndices: { [key: string]: number[] } = {}

      addMatch(matchedWords, 'computer', matchedWordIndices, 1)
      addMatch(matchedWords, 'science', matchedWordIndices, 3)

      expect(matchedWords).toEqual(['computer', 'science'])
      expect(matchedWordIndices).toEqual({
        'computer': [1],
        'science': [3]
      })
    })
  })

  describe('preprocessTargetWords', () => {
    it('should create lemma maps for target words', () => {
      const targetWords = ['computer', 'science', 'technology']
      
      const result = preprocessTargetWords(targetWords)

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(3)
      expect(result.has('computer')).toBe(true)
      expect(result.has('science')).toBe(true)
      expect(result.has('technology')).toBe(true)
      
      // Each entry should be a Set of lemmas
      expect(result.get('computer')).toBeInstanceOf(Set)
      expect(result.get('computer')?.has('computer')).toBe(true)
    })

    it('should handle empty array', () => {
      const result = preprocessTargetWords([])
      expect(result.size).toBe(0)
    })
  })

  describe('fetchAIResponse', () => {
    it('should handle echo prefix', async () => {
      const result = await fetchAIResponse('echo test response')
      expect(result).toBe('test response')
    })

    it('should call API for non-echo prompts', async () => {
      const axios = await import('axios')
      const mockedGet = vi.mocked(axios.default.get)
      mockedGet.mockResolvedValue({ data: { response: 'AI response' } })

      const result = await fetchAIResponse('test')
      
      expect(mockedGet).toHaveBeenCalledWith('/api/airesponse', {
        params: { prompt: 'test' }
      })
      expect(result).toBe('AI response')
    })
  })
})