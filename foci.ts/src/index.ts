import { startSoccerServer } from './server';

async function main(): Promise<void> {
    const runningServer = await startSoccerServer();
    // eslint-disable-next-line no-console
    console.log(`Mini soccer server listening on port ${runningServer.port}`);
}

if (require.main === module) {
    main().catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to start mini soccer server', error);
        process.exit(1);
    });
}
