"use client";
import * as Ably from "ably";
import { useEffect, useRef } from "react";

let client: Ably.Realtime | null = null;
function getClient() {
  if (!client) client = new Ably.Realtime({ authUrl: "/api/ably-token" });
  return client;
}

// Listen to a live channel. Calls onMessage every time something arrives.
export function useChannel(name: string, onMessage: (msg: Ably.Message) => void) {
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    const channel = getClient().channels.get(name);
    const listener = (m: Ably.Message) => handler.current(m);
    channel.subscribe(listener);
    return () => channel.unsubscribe(listener);
  }, [name]);
}
