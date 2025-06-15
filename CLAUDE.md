# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit-based card game built with Svelte 5, TypeScript, and Tailwind CSS.

## Key Commands

### Development
- `npm run dev` - Start development server
- `npm run dev -- --open` - Start dev server and open browser

### Building & Packaging  
- `npm run build` - Build production app and package library
- `npm run preview` - Preview production build
- `npm run prepack` - Sync and package library with publint validation

### Code Quality
- `npm run check` - Run svelte-check for TypeScript validation
- `npm run check:watch` - Run svelte-check in watch mode
- `npm run format` - Format code with Prettier
- `npm run lint` - Check code formatting with Prettier

### Testing
- `npm run test` - Run all tests (unit + e2e)
- `npm run test:unit` - Run unit tests with Vitest
- `npm run test:e2e` - Run end-to-end tests with Playwright

### Storybook
- `npm run storybook` - Start Storybook dev server on port 6006
- `npm run build-storybook` - Build Storybook for production

## Architecture

### Core Game Logic
The main game implementation is in `src/routes/+page.svelte` and includes:
- Card system with Monster and Magic card types
- 2x2 grid-based battlefield for each player
- Turn-based gameplay with CPU opponent
- Mana system for card costs
- Combat system with HP and damage

### Library Structure
- `src/lib/` - Library components and utilities (currently minimal)
- `src/routes/` - Demo/showcase application
- `src/stories/` - Storybook components and stories

### Testing Setup
- **Unit Tests**: Vitest with Testing Library for Svelte components
- **E2E Tests**: Playwright tests in `e2e/` directory
- **Storybook Tests**: Integrated with Vitest addon for story testing

### Build Configuration
- **SvelteKit**: Main framework with adapter-auto
- **Vite**: Build tool with Tailwind CSS integration
- **TypeScript**: Full type checking with svelte-check
- **Package**: Exports from `src/lib/` as reusable library

## Development Notes

### Game State Management
The game uses Svelte 5's `$state` runes for reactive state management. Key state includes:
- Player data (HP, mana, hand, field grid)
- Current turn tracking
- Card selection states

### CSS Framework  
Uses Tailwind CSS v4 with custom scrollbar styling in the main game component.

### Testing Strategy
- Component tests should be named `*.svelte.test.ts` for client-side testing
- Server-side tests use `*.test.ts` pattern
- E2E tests build and preview the app before running

### Package Export
The library exports from `src/lib/index.ts` and builds to `dist/` directory with TypeScript declarations.