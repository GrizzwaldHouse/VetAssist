// EventBus.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Typed publish/subscribe event bus — all cross-system communication goes through here
// Singleton event bus — only one bus per process; handlers are registered at startup
class EventBus {
    #handlers = {};
    subscribe(event, handler) {
        if (!this.#handlers[event]) {
            // Typed assignment — TS requires this cast because HandlerMap uses mapped types
            this.#handlers[event] = [];
        }
        const list = this.#handlers[event];
        list.push(handler);
        // Returns an unsubscribe function for cleanup
        return () => {
            const idx = list.indexOf(handler);
            if (idx !== -1)
                list.splice(idx, 1);
        };
    }
    async emit(event, payload) {
        const handlers = (this.#handlers[event] ?? []);
        // Run handlers concurrently — no ordering guarantee within the same event
        await Promise.all(handlers.map((h) => h(payload)));
    }
    // Returns the count of registered handlers — used in tests to verify wiring
    handlerCount(event) {
        return (this.#handlers[event] ?? []).length;
    }
}
export const eventBus = new EventBus();
//# sourceMappingURL=EventBus.js.map