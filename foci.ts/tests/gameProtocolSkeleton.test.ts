import { GameEngine } from '../src/game/gameEngine';
import { MESSAGE_TYPES, SOCKET_EVENTS } from '../src/protocol/messages';
import { BroadcastLike, ClientSocketLike, GameProtocolServerSkeleton } from '../src/protocol/serverSkeleton';

class MockSocket implements ClientSocketLike {
    public handlers = new Map<string, (payload: any) => void>();
    public emitted: Array<{ event: string; payload: any }> = [];

    constructor(public id: string) { }

    emit(event: string, payload: unknown): void {
        this.emitted.push({ event, payload });
    }

    on(event: string, handler: (payload: any) => void): void {
        this.handlers.set(event, handler);
    }

    trigger(event: string, payload: any): void {
        const handler = this.handlers.get(event);
        if (handler) {
            handler(payload);
        }
    }
}

class MockBroadcast implements BroadcastLike {
    public emitted: Array<{ event: string; payload: any }> = [];

    emit(event: string, payload: unknown): void {
        this.emitted.push({ event, payload });
    }
}

describe('GameProtocolServerSkeleton', () => {
    it('sends connect and game start on connection', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);

        expect(socket.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.playerConnected
        )).toBe(true);
        expect(socket.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameStart
        )).toBe(true);
    });

    it('applies controls only for connected player', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);

        socket.trigger(SOCKET_EVENTS.message, {
            type: MESSAGE_TYPES.playerControls,
            payload: { controls: [{ velocity: { x: 4, y: 0 } }] }
        });

        const state = engine.getState();
        expect(state.players[0].velocity.x).toBe(4);
        expect(state.players[0].velocity.y).toBe(0);
    });

    it('broadcasts update on tick', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);

        protocol.tick(0.05);

        expect(broadcast.emitted.some(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameUpdate
        )).toBe(true);
        expect(broadcast.emitted.some(
            (entry) => entry.event === MESSAGE_TYPES.gameUpdate
        )).toBe(true);

        const updateEnvelope = broadcast.emitted.find(
            (entry) => entry.event === SOCKET_EVENTS.message && entry.payload.type === MESSAGE_TYPES.gameUpdate
        );
        expect(updateEnvelope?.payload.payload.players[0].team).toBe('red');
    });

    it('accepts direct controls event for compatibility', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);

        socket.trigger(MESSAGE_TYPES.playerControls, {
            controls: [{ velocity: { x: 3, y: 1 } }]
        });

        const state = engine.getState();
        expect(state.players[0].velocity.x).toBe(3);
        expect(state.players[0].velocity.y).toBe(1);
    });

    it('removes player on disconnect', () => {
        const engine = new GameEngine();
        const broadcast = new MockBroadcast();
        const protocol = new GameProtocolServerSkeleton(engine, broadcast);
        const socket = new MockSocket('s1');

        protocol.handleConnection(socket);
        expect(engine.getState().players).toHaveLength(1);

        socket.trigger('disconnect', undefined);
        expect(engine.getState().players).toHaveLength(0);
    });
});
