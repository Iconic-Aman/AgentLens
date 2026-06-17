# AgentLens Console

A resilient real-time AI agent dashboard interface built on Next.js, WebSockets, and a Finite State Machine (FSM) core, designed to survive chaotic network environments without losing state.

---

## Key Features

1. **Robust Reordering Sequence Buffer**: Handles out-of-order frames, duplicate sequences, and sequence resets on fresh conversation turns.
2. **Resilient FSM**: Recovers dropped connections automatically using exponential backoff reconnects and sequence-replay synchronization (`RESUME`).
3. **High-Performance Streaming Chat**: Ref-based direct DOM manipulation to render token streams at 60fps without layout shifts or component lag.
4. **Agent Trace Timeline**: Virtualized execution trace panel showing token batches, ping/pong heartbeats, and tool lifecycles (bidirectionally linked to chat).
5. **Interactive Context Inspector**: Scrubber timeline and deep diffing engine highlighting memory changes (`added`, `removed`, `changed`) with lazy-expanding tree elements.

---

## Directory Structure

* `/frontend`: Next.js App Router project.
  * `/app`: Main application page and shell template.
  * `/components`: Controls, chat message bubbles, virtualized timeline logs, and JSON trees.
  * `/lib`: WebSocket FSM, sequence buffers, ping/pong handlers, and JSON diff engine.
  * `/__tests__`: Isolated Vitest test suites.
* `/agent-server`: Provided mock AI agent backend.

---

## Getting Started

### 1. Run the Backend Server
Normal Mode:
```bash
cd agent-server
npm install
npm run dev
```
Chaos Mode (simulates connection drops, shuffled sequences, corrupt heartbeats, large payloads):
```bash
npm run dev -- --mode chaos
```

### 2. Run the Frontend App
Install dependencies and run local dev server:
```bash
cd frontend
npm install
npm run dev
```
Build and run optimized production server:
```bash
npm run build
npm run start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Tests
Verify all unit tests pass:
```bash
cd frontend
npx vitest run
```
