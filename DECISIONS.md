# Architectural Decisions Log — AgentLens Console

This document outlines the core engineering and design decisions made during the development of the AgentLens Console.

## 1. State Architecture
We chose to manage the real-time render state using standard React `useState` and `useRef` hooks coupled with dedicated domain managers (e.g. `StreamManager`, `TraceManager`) rather than external state libraries:
* **Minimal dependencies**: Keeps the client bundle size lightweight.
* **Line-count limits**: Simplifies layout components, keeping them strictly under the 200-line limit.
* **Hot-path isolation**: Bypasses full page component re-renders when high-frequency stream tokens flow.

## 2. Sequence Buffer & Chaos Resiliency
Chaos Mode randomly introduces duplicate, out-of-order, and dropped sequence frames. We implemented the `SeqBuffer` using a `Map` + `Set` pointer:
* **Duplicate Protection**: A `Set<number>` keeps an O(1) history of all processed sequence numbers, discarding duplicate packets immediately.
* **Reordering Map**: A `Map<number, ServerMessage>` stores out-of-order packets. When a sequence gap is filled, the pointer flushes contiguous sequences in chronological order.
* **Turn Resets**: When sending a `USER_MESSAGE` to start a new conversation turn, the client resets the buffer back to `1` because the backend resets its sequence counters back to `0`.

## 3. High-Frequency Rendering Hot-Path
To prevent layout shifts and lagging frames during token generation:
* **Direct DOM Update**: The `StreamingText` component references a raw HTML span using a React `ref` and appends incoming tokens directly via `textContent`, bypassing React Virtual DOM reconciliations entirely.
* **Isolation of Tool Cards**: When a tool call interrupts the stream, we freeze the current text element and append a separate `ToolCallCard`. Resumed text segments are rendered in new, distinct span nodes below.

## 4. High-Volume JSON State Trees
Context snapshots can be 500KB+ in size. Rerendering the entire tree in the DOM would freeze the browser:
* **Lazy Expansion**: The `JsonTree` component only renders the keys at the active level on mount. Nested keys are only evaluated and mounted *on click*, keeping DOM node count minimal.
* **Inline Diffs**: We run `computeJsonDiff` on the fly to flag added, removed, and changed properties, showing values transitioning dynamically (e.g. `oldValue → newValue`).

## 5. Hydration Defense
To resolve Next.js SSR-to-client attribute hydration mismatches:
* **Mounted Guards**: Dynamic components dependent on connection status (like `Controls` and `Header`) are guarded with a `mounted` state check. During SSR and the initial client pass, they render default static `'IDLE'` states, resolving mismatches permanently.
