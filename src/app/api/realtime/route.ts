import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireSession();
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    if (closed) return;
    closed = true;
    if (timer) clearInterval(timer);
  };

  const stream = new ReadableStream({
    start(controller) {
      const tick = async () => {
        if (closed) return;
        try {
          const [open, unread] = await Promise.all([
            prisma.conversation.count({ where: { tenantId: session.tenantId, status: "open" } }),
            prisma.notification.count({
              where: {
                tenantId: session.tenantId,
                OR: [{ userId: session.id }, { userId: null }],
                readAt: null,
              },
            }),
          ]);
          if (!closed) {
            controller.enqueue(
              encoder.encode(`event: summary\ndata: ${JSON.stringify({ open, unread })}\n\n`),
            );
          }
        } catch (error) {
          if (!closed) console.error("Realtime summary failed", error);
          stop();
        }
      };

      request.signal.addEventListener("abort", stop, { once: true });
      if (request.signal.aborted) {
        stop();
        return;
      }
      void tick();
      timer = setInterval(() => void tick(), 15_000);
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
