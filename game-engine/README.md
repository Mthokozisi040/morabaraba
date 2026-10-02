# Align It Game Engine

The Align It game engine is a deterministic, UI-independent Morabaraba rules engine.

## Responsibilities

The engine handles:

- Board representation
- Legal positions
- Board connections
- Placement phase
- Movement phase
- Flying
- Mills
- Captures
- Protected mills
- Win conditions
- Draw conditions
- Resignation
- Turn management
- Move history
- Game state transitions
- Legal move generation

## Design

The engine does not know anything about:

- React
- Next.js
- Express
- Socket.IO
- PostgreSQL
- Clerk
- Browser coordinates
- UI components

It receives game state and player actions and returns a new game state.

## Run tests

From the game-engine directory:

```bash
npm test