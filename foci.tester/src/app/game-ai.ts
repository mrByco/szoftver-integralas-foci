import { GameStateQuery, IGameAI } from './game-ai.interface';
import { ControlsPayload, Vector2 } from './game-models';

export class GameAI implements IGameAI {
    readonly id = 'balanced';
    readonly label = 'Balanced';

    computeControls(query: GameStateQuery): ControlsPayload {
        const team = query.getTeam();
        const players = query.getPlayers();
        const ball = query.getBall();

        const myPlayers = players.filter(p => p.team === team);
        if (myPlayers.length === 0) {
            return { controls: [] };
        }

        // Red defends x=-10, attacks x=+10; Blue is reversed.
        const ownGoalX = team === 'red' ? -10 : 10;
        const dir = team === 'red' ? 1 : -1;

        const controls = myPlayers.map(player => {
            const localId = player.id % 100; // 0-4 regardless of team
            let target: Vector2;

            if (localId === 0) {
                // Goalkeeper: hug own goal line, track ball.y when ball is near
                const gkX = ownGoalX + dir * 1.5;
                const ballNear = (ball.pos.x - ownGoalX) * dir < 6;
                target = { x: gkX, y: ballNear ? clamp(ball.pos.y, -3, 3) : 0 };
            } else if (localId === 1) {
                // Defender: stay between ball and own goal, tracks ball.y
                const midX = (ball.pos.x + ownGoalX) / 2;
                const dMin = Math.min(ownGoalX + dir * 2, ownGoalX + dir * 6);
                const dMax = Math.max(ownGoalX + dir * 2, ownGoalX + dir * 6);
                target = { x: clamp(midX, dMin, dMax), y: ball.pos.y * 0.7 };
            } else if (localId === 2) {
                // Second defender: deeper position, covers opposite y channel
                target = { x: ownGoalX + dir * 3, y: -ball.pos.y * 0.5 };
            } else if (localId === 3) {
                // Attacker 1: chase the ball directly
                target = { x: ball.pos.x, y: ball.pos.y };
            } else {
                // Attacker 2: lead run ahead of the ball toward opponent goal
                const leadX = clamp(ball.pos.x + dir * 3, -9, 9);
                target = { x: leadX, y: ball.pos.y * 0.4 };
            }

            // Stop micro-jitter when close enough to target
            const dx = target.x - player.pos.x;
            const dy = target.y - player.pos.y;
            if (Math.sqrt(dx * dx + dy * dy) < 0.2) {
                return { id: player.id, velocity: { x: 0, y: 0 } };
            }

            return { id: player.id, velocity: directionTo(player.pos, target) };
        });

        return { controls };
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function directionTo(from: Vector2, to: Vector2): Vector2 {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
}