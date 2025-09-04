import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

vi.stubGlobal('localStorage', localStorageMock)

// Mock window object
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock all the NLP libraries globally
vi.mock('wink-lemmatizer', () => ({
  default: {
    noun: (word: string) => word.replace(/s$/, ''),
    verb: (word: string) => word.replace(/ing$|ed$/, ''),
    adjective: (word: string) => word
  },
  noun: (word: string) => word.replace(/s$/, ''),
  verb: (word: string) => word.replace(/ing$|ed$/, ''),
  adjective: (word: string) => word
}))

vi.mock('stemmer', () => ({
  default: (word: string) => word.replace(/s$|ing$|ed$/, '')
}))

vi.mock('lemmatizer', () => ({
  lemmatizer: (word: string) => word.replace(/s$|ing$|ed$/, '')
}))

vi.mock('compromise', () => {
  const mockDoc = {
    extend: vi.fn(),
    compute: vi.fn(),
    json: vi.fn(() => [{
      terms: [{
        penn: 'NN'
      }]
    }])
  }
  
  const nlpMock = Object.assign(vi.fn((text: string) => mockDoc), {
    extend: vi.fn()
  })
  
  return {
    default: nlpMock
  }
})

vi.mock('compromise-penn-tags', () => ({
  default: {}
}))

// Reset localStorage mock before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})