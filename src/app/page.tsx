"use client";
import dynamic from "next/dynamic";

// The 3D scene only runs in the browser, never on the server.
const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

export default function Home() {
  return <Scene />;
}
