import Ably from "ably";

// The fallback only keeps the build from crashing when the key is missing.
export const ablyRest = new Ably.Rest({ key: process.env.ABLY_API_KEY ?? "app.key:secret" });
