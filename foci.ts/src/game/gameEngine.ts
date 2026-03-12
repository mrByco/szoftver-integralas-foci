import { GAME_CONSTANTS, GameState, Player, PlayerControl, Team, Vector2 } from './models';

export class GameEngine {
    private state: GameState;
    private nextPlayerId = 1;

    constructor() {
        this.state = {
            players: [],
            ball: {
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 }
            },
            score: { red: 0, blue: 0 },
            goalScoredThisTick: false
        };
    }

    getState(): GameState {
        return {
            players: this.state.players.map((player) => ({
                ...player,
                position: { ...player.position },
                velocity: { ...player.velocity }
            })),
            ball: {
                position: { ...this.state.ball.position },
                velocity: { ...this.state.ball.velocity }
            },
            score: { ...this.state.score },
            goalScoredThisTick: this.state.goalScoredThisTick
        };
    }

    addPlayer(team: Team): Player {
        const player: Player = {
            id: `p${this.nextPlayerId++}`,
            team,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 }
        };

        this.state.players.push(player);
        this.resetPlayerPositions();

        return { ...player, position: { ...player.position }, velocity: { ...player.velocity } };
    }

    removePlayer(playerId: string): void {
        this.state.players = this.state.players.filter((player) => player.id !== playerId);
        this.resetPlayerPositions();
    }

    applyControls(controls: PlayerControl[]): void {
        for (const control of controls) {
            const player = this.state.players.find((candidate) => candidate.id === control.id);
            if (!player) {
                continue;
            }

            player.velocity = this.clampSpeed(control.velocity, GAME_CONSTANTS.playerMaxSpeed);
        }
    }

    tick(deltaTime: number): void {
        this.state.goalScoredThisTick = false;

        for (const player of this.state.players) {
            player.position.x += player.velocity.x * deltaTime;
            player.position.y += player.velocity.y * deltaTime;
            this.clampPlayerPosition(player);
        }

        this.state.ball.position.x += this.state.ball.velocity.x * deltaTime;
        this.state.ball.position.y += this.state.ball.velocity.y * deltaTime;

        this.state.ball.velocity.x *= GAME_CONSTANTS.ballFrictionPerTick;
        this.state.ball.velocity.y *= GAME_CONSTANTS.ballFrictionPerTick;

        this.handleBallVerticalBounds();
        this.handlePlayerBallTouches();
        this.detectGoalsOrBounceHorizontal();
    }

    private clampSpeed(vector: Vector2, maxSpeed: number): Vector2 {
        const speed = Math.hypot(vector.x, vector.y);
        if (speed <= maxSpeed || speed === 0) {
            return { x: vector.x, y: vector.y };
        }

        const ratio = maxSpeed / speed;
        return { x: vector.x * ratio, y: vector.y * ratio };
    }

    private clampPlayerPosition(player: Player): void {
        const halfWidth = GAME_CONSTANTS.mapWidth / 2;
        const halfHeight = GAME_CONSTANTS.mapHeight / 2;
        const limitX = halfWidth - GAME_CONSTANTS.playerRadius;
        const limitY = halfHeight - GAME_CONSTANTS.playerRadius;

        player.position.x = Math.max(-limitX, Math.min(limitX, player.position.x));
        player.position.y = Math.max(-limitY, Math.min(limitY, player.position.y));
    }

    private handleBallVerticalBounds(): void {
        const halfHeight = GAME_CONSTANTS.mapHeight / 2;
        const limitY = halfHeight - GAME_CONSTANTS.ballRadius;

        if (this.state.ball.position.y > limitY) {
            this.state.ball.position.y = limitY;
            this.state.ball.velocity.y *= -1;
        }

        if (this.state.ball.position.y < -limitY) {
            this.state.ball.position.y = -limitY;
            this.state.ball.velocity.y *= -1;
        }
    }

    private handlePlayerBallTouches(): void {
        const minDistance = GAME_CONSTANTS.playerRadius + GAME_CONSTANTS.ballRadius;

        for (const player of this.state.players) {
            const dx = this.state.ball.position.x - player.position.x;
            const dy = this.state.ball.position.y - player.position.y;
            const distance = Math.hypot(dx, dy);

            if (distance === 0 || distance > minDistance) {
                continue;
            }

            const normalX = dx / distance;
            const normalY = dy / distance;
            this.state.ball.velocity.x = normalX * GAME_CONSTANTS.kickStrength;
            this.state.ball.velocity.y = normalY * GAME_CONSTANTS.kickStrength;

            this.state.ball.position.x = player.position.x + normalX * minDistance;
            this.state.ball.position.y = player.position.y + normalY * minDistance;
        }
    }

    private detectGoalsOrBounceHorizontal(): void {
        const halfWidth = GAME_CONSTANTS.mapWidth / 2;
        const goalHalfHeight = GAME_CONSTANTS.goalBoxHeight / 2;
        const limitX = halfWidth - GAME_CONSTANTS.ballRadius;
        const x = this.state.ball.position.x;
        const inGoalY = Math.abs(this.state.ball.position.y) <= goalHalfHeight;

        if (inGoalY) {
            if (x >= limitX) {
                this.state.score.red += 1;
                this.resetAfterGoal();
                return;
            }

            if (x <= -limitX) {
                this.state.score.blue += 1;
                this.resetAfterGoal();
                return;
            }

            return;
        }

        if (x > limitX) {
            this.state.ball.position.x = limitX;
            this.state.ball.velocity.x *= -1;
        }
        if (x < -limitX) {
            this.state.ball.position.x = -limitX;
            this.state.ball.velocity.x *= -1;
        }
    }

    private resetAfterGoal(): void {
        this.state.goalScoredThisTick = true;
        this.state.ball.position = { x: 0, y: 0 };
        this.state.ball.velocity = { x: 0, y: 0 };

        for (const player of this.state.players) {
            player.velocity = { x: 0, y: 0 };
        }

        this.resetPlayerPositions();
    }

    private resetPlayerPositions(): void {
        const redPlayers = this.state.players.filter((player) => player.team === 'red');
        const bluePlayers = this.state.players.filter((player) => player.team === 'blue');

        const place = (players: Player[], x: number): void => {
            const spacing = 1.5;
            const offset = (players.length - 1) / 2;
            players.forEach((player, index) => {
                player.position = {
                    x,
                    y: (index - offset) * spacing
                };
            });
        };

        place(redPlayers, -5);
        place(bluePlayers, 5);
    }
}
