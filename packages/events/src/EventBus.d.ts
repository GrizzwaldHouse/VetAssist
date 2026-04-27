import type { EventPayloadMap, VetAssistEvent } from '@vetassist/shared-types';
type AsyncHandler<E extends VetAssistEvent> = (payload: EventPayloadMap[E]) => Promise<void>;
declare class EventBus {
    #private;
    subscribe<E extends VetAssistEvent>(event: E, handler: AsyncHandler<E>): () => void;
    emit<E extends VetAssistEvent>(event: E, payload: EventPayloadMap[E]): Promise<void>;
    handlerCount<E extends VetAssistEvent>(event: E): number;
}
export declare const eventBus: EventBus;
export {};
//# sourceMappingURL=EventBus.d.ts.map