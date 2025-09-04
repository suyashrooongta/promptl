import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveGameState,
  loadGameState,
  clearTimeLeft,
  getStats,
  updateStats,
  BASE_SCORE_CONSTANT,
  GAME_DURATION_CONSTANT
} from '../utils'
import { GameState } from '../types'
import { resetMocks } from './test-utils'

// Mock date formatting
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'yyyy-MM-dd') {
      return date.toISOString().split('T')[0]
    }
    return date.toISOString()
  })
}))

describe('State Management Functions', () => {
  beforeEach(() => {
    resetMocks()
    // Reset localStorage mock
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('saveGameState', () => {
    it('should save game state to localStorage', () => {
      const gameState: GameState = {
        targetWords: ['computer', 'science'],
        tabooWord: 'taboo',
        solvedWords: ['computer'],
        prompts: ['device'],
        isGameOver: false,
        isEasyMode: true,
        isPaused: false,
        score: 95,
        aiResponses: {},
        matchedWords: { 'device': ['computer'] },
        matchedWordIndices: {},
        bonusPoints: {},
        tabooWordIndices: {},
        gameDate: '2025-01-01'
      }

      saveGameState(gameState, 'v2')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_game_state_v2',
        JSON.stringify(gameState)
      )
    })

    it('should handle different variants', () => {
      const gameState: GameState = {
        targetWords: ['test'],
        tabooWord: 'taboo',
        solvedWords: [],
        prompts: [],
        isGameOver: false,
        isEasyMode: true,
        isPaused: false,
        score: BASE_SCORE_CONSTANT,
        aiResponses: {},
        matchedWords: {},
        matchedWordIndices: {},
        bonusPoints: {},
        tabooWordIndices: {}
      }

      saveGameState(gameState, 'v1')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_game_state_v1',
        JSON.stringify(gameState)
      )
    })
  })

  describe('loadGameState', () => {
    it('should load valid game state from localStorage', () => {
      const gameState: GameState = {
        targetWords: ['computer', 'science'],
        tabooWord: 'taboo',
        solvedWords: ['computer'],
        prompts: ['device'],
        isGameOver: false,
        isEasyMode: true,
        isPaused: false,
        score: 95,
        aiResponses: {},
        matchedWords: { 'device': ['computer'] },
        matchedWordIndices: {},
        bonusPoints: {},
        tabooWordIndices: {},
        gameDate: new Date().toISOString().split('T')[0] // Today's date
      }

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(gameState))

      const result = loadGameState('v2')

      expect(localStorage.getItem).toHaveBeenCalledWith('promptl_game_state_v2')
      expect(result).toEqual(gameState)
    })

    it('should return null if no saved state exists', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = loadGameState('v2')

      expect(result).toBeNull()
    })

    it('should return null if saved state is for a different date', () => {
      const oldGameState = {
        targetWords: ['computer'],
        tabooWord: 'taboo',
        gameDate: '2024-12-31' // Yesterday
      }

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldGameState))

      const result = loadGameState('v2')

      expect(result).toBeNull()
    })

    it('should handle invalid JSON in localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json')

      expect(() => loadGameState('v2')).toThrow()
    })
  })

  describe('clearTimeLeft', () => {
    it('should remove time left from localStorage', () => {
      clearTimeLeft('v2')

      expect(localStorage.removeItem).toHaveBeenCalledWith('promptl_time_left_v2')
    })

    it('should handle different variants', () => {
      clearTimeLeft('v1')

      expect(localStorage.removeItem).toHaveBeenCalledWith('promptl_time_left_v1')
    })
  })

  describe('getStats', () => {
    it('should return default stats when no saved stats exist', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const stats = getStats('v2')

      expect(stats).toEqual({
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        currentStreak: 0,
        maxStreak: 0,
        lastPlayedDate: '',
        totalTimeUsed: 0,
        totalPromptsUsed: 0
      })
    })

    it('should return saved stats when they exist', () => {
      const savedStats = {
        gamesPlayed: 5,
        gamesWon: 3,
        totalScore: 450,
        currentStreak: 2,
        maxStreak: 3,
        lastPlayedDate: '2025-01-01',
        totalTimeUsed: 1500,
        totalPromptsUsed: 25
      }

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(savedStats))

      const stats = getStats('v2')

      expect(localStorage.getItem).toHaveBeenCalledWith('promptl_stats_v2')
      expect(stats).toEqual(savedStats)
    })
  })

  describe('updateStats', () => {
    beforeEach(() => {
      // Mock getStats to return default stats
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key?.includes('stats')) {
          return JSON.stringify({
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            currentStreak: 0,
            maxStreak: 0,
            lastPlayedDate: '',
            totalTimeUsed: 0,
            totalPromptsUsed: 0
          })
        }
        if (key?.includes('time_left')) {
          return '300000' // 5 minutes left
        }
        return null
      })
    })

    it('should update stats for a won game', () => {
      updateStats(true, 95, 3, 'v2')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"gamesPlayed":1')
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"gamesWon":1')
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"totalScore":95')
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"currentStreak":1')
      )
    })

    it('should update stats for a lost game', () => {
      updateStats(false, 0, 5, 'v2')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"gamesPlayed":1')
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"gamesWon":0')
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"currentStreak":0')
      )
    })

    it('should handle consecutive wins (streak)', () => {
      // Mock existing stats with a current streak
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key?.includes('stats')) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          return JSON.stringify({
            gamesPlayed: 1,
            gamesWon: 1,
            totalScore: 85,
            currentStreak: 1,
            maxStreak: 1,
            lastPlayedDate: yesterday.toISOString().split('T')[0],
            totalTimeUsed: 400,
            totalPromptsUsed: 4
          })
        }
        if (key?.includes('time_left')) {
          return '240000' // 4 minutes left
        }
        return null
      })

      updateStats(true, 90, 2, 'v2')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"currentStreak":2')
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining('"maxStreak":2')
      )
    })

    it('should calculate time used correctly', () => {
      // Mock 2 minutes left (out of 10 minute game)
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key?.includes('time_left')) {
          return '120000' // 2 minutes left
        }
        if (key?.includes('stats')) {
          return JSON.stringify({
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            currentStreak: 0,
            maxStreak: 0,
            lastPlayedDate: '',
            totalTimeUsed: 0,
            totalPromptsUsed: 0
          })
        }
        return null
      })

      updateStats(true, 95, 3, 'v2')

      // Should have used 8 minutes (10 - 2)
      const expectedTimeUsed = GAME_DURATION_CONSTANT - 120000
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'promptl_stats_v2',
        expect.stringContaining(`"totalTimeUsed":${expectedTimeUsed}`)
      )
    })
  })
})