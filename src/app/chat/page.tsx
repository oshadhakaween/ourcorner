"use client";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useChannel } from "@/lib/useChannel";

type Msg = { id: number; senderId: string; senderName: string; body: string; createdAt: string };

export default function ChatPage() {
  const { user } = useUser();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  // add a message unless we already have it
  const add = (m: Msg) =>
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  // load old messages once
  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((rows: Msg[]) =>
        setMsgs((prev) => {
          const ids = new Set(rows.map((r) => r.id));
          return [...rows, ...prev.filter((p) => !ids.has(p.id))];
        })
      );
  }, []);

  // new messages arrive live
  useChannel("chat", (m) => add(m.data as Msg));

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) add(await res.json());
  }

  return (
    <main className="mx-auto flex h-dvh max-w-xl flex-col p-4 pb-20 md:pb-4 md:pt-16">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {msgs.map((m) => (
          <div key={m.id} className={m.senderId === user?.id ? "text-right" : "text-left"}>
            <span
              className={
                m.senderId === user?.id
                  ? "inline-block rounded-2xl bg-pink-500 px-3 py-2 text-white"
                  : "inline-block rounded-2xl bg-pink-100 px-3 py-2"
              }
            >
              {m.body}
            </span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-full border px-4 py-2"
          placeholder="Write something sweet..."
        />
        <button className="rounded-full bg-pink-500 px-5 text-white">Send</button>
      </form>
    </main>
  );
}
