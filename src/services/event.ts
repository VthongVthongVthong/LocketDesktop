type LocalEventTypes = {
    'downloadCurrentImage': [],
}

class TypedEventEmitter<TEvents extends Record<string, any>> {
    private emitter = new EventTarget();

    emit<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        ...eventArg: TEvents[TEventName]
    ) {
        const event = new CustomEvent(eventName, { detail: eventArg });
        this.emitter.dispatchEvent(event);
    }

    on<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        handler: (...eventArg: TEvents[TEventName]) => void
    ) {
        this.emitter.addEventListener(eventName, (event: Event) => {
            handler(...(event as CustomEvent).detail);
        });
    }

    off<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        handler: (...eventArg: TEvents[TEventName]) => void
    ) {
        this.emitter.removeEventListener(eventName, (event: Event) => {
            handler(...(event as CustomEvent).detail);
        });
    }
}

const eventBroker = new TypedEventEmitter<LocalEventTypes>();

export default eventBroker;