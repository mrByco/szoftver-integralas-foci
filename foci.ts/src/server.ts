import http from 'http';
import { Server } from 'socket.io';
import { GameEngine } from './game/gameEngine';
import { GameProtocolServerSkeleton } from './protocol/serverSkeleton';

export interface SoccerServerOptions {
    port?: number;
    tickMs?: number;
}

export interface RunningSoccerServer {
    port: number;
    io: Server;
    stop: () => Promise<void>;
}

export async function startSoccerServer(options: SoccerServerOptions = {}): Promise<RunningSoccerServer> {
    const port = options.port ?? Number(process.env.PORT ?? 3001);
    const tickMs = options.tickMs ?? 50;

    const httpServer = http.createServer();
    const io = new Server(httpServer, {
        cors: {
            origin: '*'
        }
    });

    const engine = new GameEngine();
    const protocol = new GameProtocolServerSkeleton(engine, io);

    io.on('connection', (socket) => {
        protocol.handleConnection(socket);
    });

    const interval = setInterval(() => {
        protocol.tick(tickMs / 1000);
    }, tickMs);

    await new Promise<void>((resolve) => {
        httpServer.listen(port, resolve);
    });

    const address = httpServer.address();
    const resolvedPort = typeof address === 'object' && address ? address.port : port;

    return {
        port: resolvedPort,
        io,
        stop: async () => {
            clearInterval(interval);
            io.removeAllListeners();
            await new Promise<void>((resolve, reject) => {
                httpServer.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
        }
    };
}
