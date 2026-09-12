import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { fromApiError, apiError } from "@/lib/api";
import { automationQueue } from "@/lib/queue";

export async function GET() {
  try {
    await requireRole("OWNER", "ADMIN");
    if (!automationQueue) return NextResponse.json({ available: false, reason: "REDIS_URL is not configured" });
    const [counts, failed] = await Promise.all([
      automationQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
      automationQueue.getFailed(0, 24),
    ]);
    return NextResponse.json({
      available: true,
      counts,
      failed: failed.map((job) => ({
        id: job.id,
        name: job.name,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason || "Unknown error",
        finishedOn: job.finishedOn || null,
      })),
    });
  } catch (error) {
    return fromApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("OWNER", "ADMIN");
    if (!automationQueue) return apiError(503, "WORKER_UNAVAILABLE", "Redis-backed worker is not configured");
    const { jobId } = z.object({ jobId: z.string().min(1).max(100) }).parse(await req.json());
    const job = await automationQueue.getJob(jobId);
    if (!job) return apiError(404, "JOB_NOT_FOUND", "Worker job not found");
    if ((await job.getState()) !== "failed") return apiError(409, "JOB_NOT_FAILED", "Only failed jobs can be retried");
    await job.retry();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fromApiError(error);
  }
}
