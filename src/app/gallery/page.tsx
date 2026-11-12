"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Photo = { id: number; url: string; caption: string | null };
const json = { "Content-Type": "application/json" };

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/photos");
    if (res.ok) setPhotos(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      // 1. ask our server for a short-lived upload link
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: json,
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Could not get an upload link");
      const { url, key } = await res.json();

      // 2. send the photo straight to Cloudflare R2
      const put = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload to storage failed (check the R2 CORS settings)");

      // 3. remember it in the database
      await fetch("/api/photos", { method: "POST", headers: json, body: JSON.stringify({ key }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:pb-6 md:pt-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light">Our photos</h1>
        <label className="cursor-pointer rounded-full bg-pink-500 px-5 py-2 text-white">
          {busy ? "Uploading..." : "Add photo"}
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={upload}
          />
        </label>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.id} src={p.url} alt={p.caption ?? "Our photo"} className="aspect-square w-full rounded-xl object-cover" />
        ))}
      </div>
      {photos.length === 0 && <p className="text-neutral-500">No photos yet. Add your first one.</p>}
    </main>
  );
}
