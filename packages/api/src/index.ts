import { buildServer } from "./server.ts";

const start = async () => {
    try {
        const server = await buildServer();
        const port = parseInt(process.env.PORT || "3000");
        const host = process.env.HOST || "0.0.0.0";

        await server.listen({ port, host });
        console.log(`🚀 API Server running at http://${host}:${port}`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
