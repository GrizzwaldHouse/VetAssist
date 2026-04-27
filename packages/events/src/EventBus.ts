// EventBus.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Typed publish/subscribe event bus — all cross-system communication goes through here

import type { EventPayloadMap, VetAssistEvent } from '@vetassist/shared-types';

type AsyncHandler<E extends VetAssistEvent> = (payload: EventPayloadMap[E]) => Promise<void>;
type HandlerMap = {
  [E in VetAssistEvent]?: Array<AsyncHandler<E>>;
};

// Singleton event bus — only one bus per process; handlers are registered at startup
class EventBus {
  readonly #handlers: HandlerMap = {};

  subscribe<E extends VetAssistEvent>(event: E, handler: AsyncHandler<E>): () => void {
    if (!this.#handlers[event]) {
      // Typed assignment — TS requires this cast because HandlerMap uses mapped types
      (this.#handlers as Record<string, unknown[]>)[event] = [];
    }

    const list = this.#handlers[event] as Array<AsyncHandler<E>>;
    list.push(handler);

    // Returns an unsubscribe function for cleanup
    return () => {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    };
  }

  async emit<E extends VetAssistEvent>(event: E, payload: EventPayloadMap[E]): Promise<void> {
    const handlers = (this.#handlers[event] ?? []) as Array<AsyncHandler<E>>;
    // Run handlers concurrently — no ordering guarantee within the same event
    await Promise.all(handlers.map((h) => h(payload)));
  }

  // Returns the count of registered handlers — used in tests to verify wiring
  handlerCount<E extends VetAssistEvent>(event: E): number {
    return (this.#handlers[event] ?? []).length;
  }
}

export const eventBus = new EventBus();
