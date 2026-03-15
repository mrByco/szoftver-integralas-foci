import { GameEngine } from '../src/game/gameEngine';
import { GAME_CONSTANTS } from '../src/game/models';

describe('GameEngine', () => {
    it('adds players with requested teams', () => {
        const engine = new GameEngine();

        const redPlayer = engine.addPlayer('red');
        const bluePlayer = engine.addPlayer('blue');

        expect(redPlayer.team).toBe('red');
        expect(bluePlayer.team).toBe('blue');
        expect(engine.getState().players).toHaveLength(2);
    });

    it('normalizes input direction and scales to player max speed', () => {
        const engine = new GameEngine();
        const player = engine.addPlayer('red');

        engine.applyControls([
            {
                id: player.id,
                velocity: { x: 3, y: 4 }  // magnitude 5, arbitrary non-unit vector
            }
        ]);

        const statePlayer = engine.getState().players.find((candidate) => candidate.id === player.id);
        expect(statePlayer).toBeDefined();
        expect(Math.hypot(statePlayer!.velocity.x, statePlayer!.velocity.y)).toBeCloseTo(GAME_CONSTANTS.playerMaxSpeed, 5);
        // direction should be preserved: 3/5 = 0.6, 4/5 = 0.8
        expect(statePlayer!.velocity.x).toBeCloseTo((3 / 5) * GAME_CONSTANTS.playerMaxSpeed, 5);
        expect(statePlayer!.velocity.y).toBeCloseTo((4 / 5) * GAME_CONSTANTS.playerMaxSpeed, 5);
    });

    it('kicks ball when player touches it', () => {
        const engine = new GameEngine();
        const player = engine.addPlayer('red');

        engine.applyControls([
            {
                id: player.id,
                velocity: { x: 0, y: 0 }
            }
        ]);

        const stateBefore = engine.getState();
        const controlled = stateBefore.players.find((candidate) => candidate.id === player.id)!;

        (engine as any).state.ball.position = {
            x: controlled.position.x + GAME_CONSTANTS.playerRadius + GAME_CONSTANTS.ballRadius - 0.01,
            y: controlled.position.y
        };
        (engine as any).state.ball.velocity = { x: 0, y: 0 };

        engine.tick(0.05);

        const stateAfter = engine.getState();
        expect(Math.hypot(stateAfter.ball.velocity.x, stateAfter.ball.velocity.y)).toBeGreaterThan(0);
    });

    it('increments score and resets after goal', () => {
        const engine = new GameEngine();
        engine.addPlayer('red');

        (engine as any).state.ball.position = { x: GAME_CONSTANTS.mapWidth / 2 + 0.1, y: 0 };
        (engine as any).state.ball.velocity = { x: 1, y: 0 };

        engine.tick(0.05);

        const state = engine.getState();
        expect(state.score.red).toBe(1);
        expect(state.goalScoredThisTick).toBe(true);
        expect(state.ball.position).toEqual({ x: 0, y: 0 });
        expect(Math.hypot(state.ball.velocity.x, state.ball.velocity.y)).toBeGreaterThan(0);
    });
});
