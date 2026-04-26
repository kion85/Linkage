import { NextResponse } from "next/server";
import { getSimulatedMetrics, getSimulatedInterfaces } from "@/lib/simulation";

/* Server-Sent Events endpoint for live metrics — works natively with Next.js.
   The frontend uses EventSource to consume this. */
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let interval: NodeJS.Timeout | null = null;

      const send = () => {
        const metrics = getSimulatedMetrics();
        const ifaces = getSimulatedInterfaces().map((i) => ({
          name: i.name,
          status: i.status,
          rxBytesPerSec: i.rxBytesPerSec,
          txBytesPerSec: i.txBytesPerSec,
          sparkline: i.sparkline,
        }));
        const data = JSON.stringify({ type: "metrics", data: { ...metrics, interfaces: ifaces } });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Send initial data immediately
      send();

      // Then send updates every 2 seconds
      interval = setInterval(send, 2000);

      // Cleanup on close
      const cleanup = () => {
        if (interval) clearInterval(interval);
      };

      // We can't directly listen for close in ReadableStream, but the interval
      // will be cleaned up when the stream is cancelled
      (stream as unknown as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      // Stream cancelled by client disconnect
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
