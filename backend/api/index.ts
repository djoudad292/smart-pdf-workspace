import { getHandler } from "../src/main.js";

// Vercel serverless entrypoint — all routes rewrite here (see vercel.json).
export default async function handler(req: unknown, res: unknown) {
  const handle = await getHandler();
  handle(req, res);
}
