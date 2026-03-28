import PusherServer from "pusher";

const appId = process.env.PUSHER_APP_ID || "";
const key = process.env.PUSHER_KEY || "";
const secret = process.env.PUSHER_SECRET || "";
const cluster = process.env.PUSHER_CLUSTER || "";

const hasCredentials = Boolean(appId && key && secret && cluster);

export const pusherServer = hasCredentials ? new PusherServer({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
}) : {
  trigger: async () => console.log("[Mock Pusher] Triggered event"),
  authorizeChannel: () => ({ auth: "mock", channel_data: "{}" })
} as unknown as PusherServer;
