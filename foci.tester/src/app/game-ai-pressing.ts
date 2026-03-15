import { GameStateQuery, IGameAI } from './game-ai.interface';
import { ControlsPayload, Team, Vector2 } from './game-models';

export class PressingGameAI implements IGameAI {
  readonly id = 'pressing';
  readonly label = 'Pressing';

  computeControls(query: GameStateQuery): ControlsPayload {
    const team = query.getTeam();
    const players = query.getPlayers();
    const ball = query.getBall();

    const myPlayers = players.filter(p => p.team === team);
    if (myPlayers.length === 0) {
      return { controls: [] };
    }

    const oppGoalX = team === 'red' ? 10 : -10;
    const dir = team === 'red' ? 1 : -1;

    const controls = myPlayers.map(player => {
      const localId = player.id % 100;
      let target: Vector2;

      if (localId === 0) {
        // Sweeper keeper: slightly advanced and centered on ball lane.
        target = { x: team === 'red' ? -7.5 : 7.5, y: clamp(ball.pos.y * 0.6, -3.5, 3.5) };
      } else if (localId === 1 || localId === 2) {
        // High defensive line pinching toward ball side.
        const x = team === 'red' ? -2.5 : 2.5;
        const yBias = localId === 1 ? -1.5 : 1.5;
        target = { x, y: clamp(ball.pos.y * 0.9 + yBias, -6, 6) };
      } else if (localId === 3) {
        // Ball hunter.
        target = { x: ball.pos.x, y: ball.pos.y };
      } else {
        // Forward runner to receive through ball.
        const leadX = clamp(ball.pos.x + dir * 4.5, -9.5, 9.5);
        target = { x: leadX, y: clamp(ball.pos.y * 0.2, -4, 4) };
      }

      // Near opponent goal, crash the box.
      if ((oppGoalX - player.pos.x) * dir < 4) {
        target = { x: oppGoalX - dir * 0.8, y: clamp(ball.pos.y * 0.5, -2.5, 2.5) };
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
  if (dist < 0.01) {
    return { x: 0, y: 0 };
  }

  return { x: dx / dist, y: dy / dist };
}
