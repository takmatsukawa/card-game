# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit-based card game built with Svelte 5, TypeScript, Tailwind CSS, and XState for state management.

## Key Commands

See @package.json for available npm commands for this project.

## Architecture

### Core Game Logic

The main game implementation is in `src/routes/+page.svelte` and includes:

- Card system with Monster and Magic card types
- 2x2 grid-based battlefield for each player
- Turn-based gameplay with CPU opponent
- Stone (mana) system for card costs
- Combat system with HP and damage

### State Management with XState

The game uses XState for predictable state management (`src/lib/gameStateMachine.ts`):

- **States**: `playerTurn` and `cpuTurn` with automatic transitions
- **Events**: `SELECT_CARD`, `PLACE_CARD`, `END_TURN`, `RESET_SELECTION`
- **Context**: Players, current turn, selected cards/cells, winner state
- **Actions**: Card placement, turn switching, CPU behavior, waiting status updates
- **Guards**: Validation for card placement and turn restrictions

### Library Structure

- `src/lib/gameStateMachine.ts` - XState state machine with game logic
- `src/lib/index.ts` - Library exports including state machine
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
- **XState**: State machine library with @xstate/svelte integration
- **Package**: Exports from `src/lib/` as reusable library

## Development Notes

### Code Quality and Formatting

- **After Task Completion**: Always run `npm run format` after completing any development task to ensure consistent code formatting across the project
- This applies to all code changes including new features, bug fixes, refactoring, and test additions

### XState Implementation Pattern

The game follows XState best practices for state management:

- Use `useMachine()` hook from `@xstate/svelte` for component integration
- Access context via `$snapshot.context` reactive statement
- Send events using `send({ type: 'EVENT_NAME', ...payload })`
- State transitions are handled automatically by the machine
- CPU behavior is implemented as machine actions with delayed transitions

### CSS Framework

Uses Tailwind CSS v4 with custom scrollbar styling in the main game component.

### Testing Strategy

- Component tests should be named `*.svelte.test.ts` for client-side testing
- Server-side tests use `*.test.ts` pattern
- E2E tests build and preview the app before running

### Package Export

The library exports from `src/lib/index.ts` and builds to `dist/` directory with TypeScript declarations. The main export includes the `gameStateMachine` and related types for reuse in other projects.

### Working with State Machines

When extending the game logic:

1. **Adding new events**: Define in `GameEvent` type and add handlers in machine config
2. **New state transitions**: Add states in the machine definition with appropriate guards
3. **Context updates**: Use `assign()` action to update game context immutably
4. **CPU logic**: Implement as actions that run on state entry or delayed transitions
5. **Validation**: Use guards to prevent invalid state transitions or actions
