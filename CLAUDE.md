# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Promptl is a word-based game built with Next.js, TypeScript, and PostgreSQL. Players create single-word prompts to make an AI mention 5 target words while avoiding a taboo word. The game features scoring, timers, and statistics tracking.

## Available Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - Build production application  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run vercel-build` - Generate Prisma client, deploy migrations, and build (for Vercel deployment)

### Testing/Utilities
- `npm run devtest` - Run custom tests via `npx tsx tests.ts`
- `npm run devDataGen` - Generate word sets via `npx tsx printWordSets.ts`

## Architecture

### Core Game Logic
- **Game State Management**: Centralized in `utils.ts` with functions for game data generation, scoring, and word validation
- **Daily Word Generation**: Deterministic word selection using date-based seeding in `getGameData()`
- **AI Integration**: OpenAI API calls cached in PostgreSQL database via `/api/airesponse` endpoint
- **Word Processing**: Complex lemmatization and stemming using multiple NLP libraries (wink-nlp, compromise, stemmer)

### Frontend Structure
- **Pages**: Next.js pages in `/pages` directory
  - `index.tsx` - Main game interface (v2)
  - `v1.tsx` - Legacy game version  
  - `help.tsx`, `batchprocess.tsx` - Additional interfaces
- **Components**: Reusable React components in `/components`
  - Game UI components (Timer, Stats, AIResponse)
  - Multiple versions (e.g., HowToPlay vs HowToPlayV2)
- **State Management**: React useState with localStorage persistence

### Database Schema (Prisma)
- `AiResponse` - Caches OpenAI responses by prompt
- `AiResponseRelatedWords` - Additional AI response caching
- Uses PostgreSQL via `DATABASE_URL` environment variable

### Game Mechanics
- **Scoring**: Base score 100, penalties for taboo hits (-10) and wasted prompts (-5), bonuses for multiple matches (+5 each)
- **Validation**: Word validation against word-list-json, derivative checking via lemmatization
- **Game Variants**: v1 and v2 supported via variant parameter throughout codebase
- **Time Limits**: 10-minute games with pause/resume functionality

### Key Dependencies
- **Next.js 15.2.0** - Framework
- **Prisma 6.5.0** - Database ORM  
- **OpenAI 4.90.0** - AI API integration
- **NLP Libraries**: compromise, wink-nlp, stemmer, lemmatizer for word processing
- **UI**: Tailwind CSS, Lucide React icons

### Development Patterns
- Uses `@/*` path alias for imports
- TypeScript strict mode enabled
- React Strict Mode enabled
- Game state persisted to localStorage with daily reset logic
- Extensive use of lemmatization for fuzzy word matching in both easy and hard modes