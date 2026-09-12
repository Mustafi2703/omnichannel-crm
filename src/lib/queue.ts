import { Queue } from "bullmq";
const url = process.env.REDIS_URL;
const connection = url ? { url } : undefined;
export const automationQueue = connection ? new Queue("automation", { connection }) : null;
export async function enqueueAutomation(name: string, data: object) {
  if (!automationQueue) throw new Error("REDIS_URL is required to enqueue automation work");
  await automationQueue.add(name, data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
