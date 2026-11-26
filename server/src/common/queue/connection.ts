import type { ConnectionOptions } from "bullmq";
import { env } from "../../env.js";

// How long to wait before reconnecting to Redis. ioredis restarts its own retry count every time a connection opens, so a
// Redis that accepts the connection and then drops it (as Upstash does once a plan limit is reached) was retried every
// second, forever, sending every waiting command again each time, with the full text of each script. That used up a
// whole month of Upstash bandwidth in a day. This keeps its own count and only forgets it once a connection has stayed up
// for a couple of minutes: 1s, 2s, 4s ... and at most 5 minutes between attempts.
const STAYED_UP_MS = 2 * 60_000;
const LONGEST_WAIT_MS = 5 * 60_000;

const reconnectBackoff = (name: string) => {
    let attempts = 0;
    let lastAttemptAt = 0;
    let lastWait = 0;
    return () => {
        const now = Date.now();
        // Time the last connection stayed open: from when it was opened until it dropped.
        if (lastAttemptAt && now - lastAttemptAt - lastWait > STAYED_UP_MS) attempts = 0;
        attempts++;
        lastWait = Math.min(1000 * 2 ** (attempts - 1), LONGEST_WAIT_MS);
        lastAttemptAt = now;
        if (attempts === 6) console.warn(`[Redis] The ${name} connection keeps dropping; waiting longer between reconnects (up to 5 minutes).`);
        return lastWait;
    };
};

// The side that puts grading jobs in the queue. While Redis can't be reached, a command fails at once instead of waiting
// in memory to be sent again after every reconnect (0 retries is the only value ioredis honours here, because its own
// count restarts on each connect). The submission that could not be queued stays "evaluating" and the recovery sweep
// (workers.ts) queues it later.
export const queueConnection: ConnectionOptions = {
    url: env.REDIS_URL,
    connectionName: "abhyas:queue",
    retryStrategy: reconnectBackoff("queue"),
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
};

// The worker that grades. Otherwise on ioredis's defaults, so renewing a job's lock or finishing a job survives a short
// drop in the connection.
export const workerConnection: ConnectionOptions = {
    url: env.REDIS_URL,
    connectionName: "abhyas:worker",
    retryStrategy: reconnectBackoff("worker"),
};
