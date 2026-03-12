import { Ball, GameState, Player } from '../game/models';
import { BallDto, PlayerDto } from './messages';

export function toPlayerDto(player: Player): PlayerDto {
    return {
        id: player.id,
        team: player.team,
        pos: {
            x: player.position.x,
            y: player.position.y
        },
        velocity: {
            x: player.velocity.x,
            y: player.velocity.y
        }
    };
}

export function toBallDto(ball: Ball): BallDto {
    return {
        pos: {
            x: ball.position.x,
            y: ball.position.y
        },
        velocity: {
            x: ball.velocity.x,
            y: ball.velocity.y
        }
    };
}

export function toStateDto(state: GameState): { players: PlayerDto[]; ball: BallDto } {
    return {
        players: state.players.map(toPlayerDto),
        ball: toBallDto(state.ball)
    };
}
