import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate secret if you have one, to prevent unauthorized calls
    // For now we trust it if it has the right shape
    if (body.source !== "google-sheets") {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    // Trigger pusher event
    await pusherServer.trigger("private-financetracker", "sync-event", {
      table: body.table || "all",
      action: "webhook-update"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
