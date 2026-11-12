"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useChannel } from "@/lib/useChannel";

type Room = {
  id: string;
  game: string;
  hostId: string;
  guestId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  turn: string | null;
  status: string;
  winner: string | null;
  version: number;
};

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useUser();
  const [room, setRoom] = useState<Room | null>(null);
  const [notice, setNotice] = useState("");

  // load the game once
  useEffect(() => {
    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then(setRoom);
  }, [roomId]);

  // then follow live updates (only ever accept a newer version)
  useChannel(`room:${roomId}`, (m) => {
    const next = m.data as Room;
    setRoom((cur) => (!cur || next.version >= cur.version ? next : cur));
  });

  async function play(move: unknown) {
    setNotice("");
    const res = await fetch(`/api/rooms/${roomId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move }),
    });
    if (res.ok) setRoom(await res.json());
    else setNotice(await res.text());
  }

  if (!room) return <p className="p-6 md:pt-16">Loading...</p>;

  const myTurn = room.status === "playing" && room.turn === user?.id;
  const status =
    room.status === "waiting"
      ? "Waiting for your partner to join..."
      : room.status === "finished"
        ? room.winner === "draw"
          ? "A draw!"
          : room.winner === user?.id
            ? "You won!"
            : "Your partner won"
        : myTurn
          ? "Your turn"
          : "Their turn";

  return (
    <main className="mx-auto max-w-md space-y-4 p-6 pb-24 text-center md:pb-6 md:pt-16">
      <h1 className="text-xl">{status}</h1>

      {room.game === "tictactoe" && (
        <div className="mx-auto grid w-72 grid-cols-3 gap-2">
          {(room.state.board as (0 | 1 | null)[]).map((c, i) => (
            <button
              key={i}
              disabled={!myTurn || c !== null}
              onClick={() => play({ cell: i })}
              className="aspect-square rounded-xl bg-pink-50 text-4xl shadow"
            >
              {c === null ? "" : c === 0 ? "♥" : "★"}
            </button>
          ))}
        </div>
      )}

      {room.game === "connect4" && (
        <div className="mx-auto flex w-fit gap-1 rounded-2xl bg-pink-200 p-2">
          {Array.from({ length: 7 }).map((_, col) => (
            <button
              key={col}
              disabled={!myTurn}
              onClick={() => play({ col })}
              className="flex flex-col gap-1"
              aria-label={`Drop in column ${col + 1}`}
            >
              {Array.from({ length: 6 }).map((_, row) => {
                const v = (room.state.board as (0 | 1 | null)[][])[row][col];
                const colour = v === null ? "bg-white" : v === 0 ? "bg-pink-500" : "bg-amber-400";
                return <span key={row} className={`block h-9 w-9 rounded-full sm:h-11 sm:w-11 ${colour}`} />;
              })}
            </button>
          ))}
        </div>
      )}

      {notice && <p className="text-sm text-red-600">{notice}</p>}
      <p>
        <Link href="/games" className="text-pink-600 underline">
          Back to games
        </Link>
      </p>
    </main>
  );
}
