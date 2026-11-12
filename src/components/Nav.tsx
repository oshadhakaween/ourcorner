import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

// Sits at the bottom on phones, at the top on bigger screens.
export default function Nav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t bg-white/80 py-3 backdrop-blur md:bottom-auto md:top-0 md:border-b md:border-t-0">
      <Link href="/">Home</Link>
      <Link href="/chat">Chat</Link>
      <Link href="/games">Games</Link>
      <Link href="/gallery">Gallery</Link>
      <UserButton />
    </nav>
  );
}
