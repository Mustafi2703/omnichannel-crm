import { NextResponse } from "next/server";
import Redis from "ioredis";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const redisUrl = process.env.REDIS_URL;
  let redis: Redis | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (redisUrl) {
      redis = new Redis(redisUrl, { connectTimeout: 1500, maxRetriesPerRequest: 1 });
      await redis.ping();
    }
    return NextResponse.json({ status: "ready", postgres: "up", redis: redisUrl ? "up" : "not-configured" });
  } catch {
    return NextResponse.json({ status: "not-ready" }, { status: 503 });
  } finally {
    redis?.disconnect();
  }
}
