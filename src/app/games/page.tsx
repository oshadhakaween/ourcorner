"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type Room = { id: string; game: string; hostId: string; status: string };
const json = { "Content-Type": "application/json" };
const NAMES: Record<string, string> = { tictactoe: "Tic-Tac-Toe", connect4: "Connect Four" };

export default function Lobby() {
  const router = useRouter();
  const { user } = useUser();
  const [rooms, setRooms] = useState<Room[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/rooms");
    if (res.ok) setRooms(await res.json());
  }, []);

  // refresh the list every 4 seconds
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function create(game: string) {
    const res = await fetch("/api/rooms", { method: "POST", headers: json, body: JSON.stringify({ game }) });
    const room = await res.json();
    router.push(`/games/${room.id}`);
  }

  async function join(id: string) {
    await fetch(`/api/rooms/${id}/join`, { method: "POST" });
    router.push(`/games/${id}`);
  }

  const btn = "rounded-full bg-pink-500 px-5 py-2 text-white";

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6 pb-24 md:pb-6 md:pt-16">
      <h1 className="text-2xl font-light">Play together</h1>
      <div className="flex flex-wrap gap-3">
        <button className={btn} onClick={() => create("tictactoe")}>New Tic-Tac-Toe</button>
        <button className={btn} onClick={() => create("connect4")}>New Connect Four</button>
      </div>
      <div className="space-y-2">
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
            <span>
              {NAMES[r.game] ?? r.game} ({r.status})
            </span>
            {r.status === "waiting" && r.hostId !== user?.id ? (
              <button className={btn} onClick={() => join(r.id)}>Join</button>
            ) : (
              <button className={btn} onClick={() => router.push(`/games/${r.id}`)}>Open</button>
            )}
          </div>
        ))}
        {rooms.length === 0 && <p className="text-neutral-500">No open games. Start one above.</p>}
      </div>
    </main>
  );
}
