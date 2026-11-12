import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

// Sits at the bottom on phones, at the top on bigger screens.
// "Home" and "Arcade" are your original site pages, so they use plain links.
export default function Nav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t bg-white/80 py-3 text-sm backdrop-blur md:bottom-auto md:top-0 md:border-b md:border-t-0 md:text-base">
      <a href="/">Home</a>
      <Link href="/chat">Chat</Link>
      <Link href="/games">Together</Link>
      <Link href="/gallery">Photos</Link>
      <a href="/games.html">Arcade</a>
      <UserButton />
    </nav>
  );
}
