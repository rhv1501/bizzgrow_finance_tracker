import { pusherServer } from "@/lib/pusher-server";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await request.formData();
  const socketId = data.get("socket_id") as string;
  const channel = data.get("channel_name") as string;

  const authResponse = pusherServer.authorizeChannel(socketId, channel, {
    user_id: session.userId,
    user_info: { name: session.name, role: session.role }
  });

  return new Response(JSON.stringify(authResponse));
}
