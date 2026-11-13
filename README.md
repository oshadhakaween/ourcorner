# Our Corner 💕

Your original scrolling 3D site, now private and shared by two people.

* **Login required** the moment the page loads (Clerk). Only the two emails in `ALLOWED_EMAILS` get in.
* **Profile chip** in the top bar (you, your person, days together, sign out).
* **Chat** is a section of the home page (`#chat`), live between your two phones.
* **Photo vault** is editable: open the vault, press **Edit vault** to add, rename or delete photos.
* **Arcade** now has a **Two players** tab: Tic-Tac-Toe, Connect Four and Memory Match, live on two screens, with invites and rematch.

## How it is built

| What | Where |
|---|---|
| The site you see (pages, 3D, arcade) | `private-site/` (plain HTML, CSS, JS) |
| Chat, vault editing, profile chip | `private-site/chat.js`, `vault.js`, `app.js` |
| Two-player games (screens) | `private-site/together.js` |
| Login gate + serving the site | `src/proxy.ts`, `src/app/[[...path]]/route.ts` |
| Server: chat, photos, game rules | `src/app/api/**`, `src/lib/games/**` |
| Database tables | `src/db/schema.ts` (Neon) |

## Settings (environment variables)

The names are listed in `.env.example`. They are the same ones you already set on Vercel, so you do not need to change anything.

## One-time checks

1. **Clerk**: both of you have signed up, and `ALLOWED_EMAILS` on Vercel lists both emails.
2. **R2 photo uploads**: in Cloudflare, open your bucket → Settings → CORS policy and paste:

```json
[
  {
    "AllowedOrigins": ["https://YOUR-SITE.vercel.app"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

3. **Database**: nothing new to do. The tables are the same as before. (Only if they are missing: in a terminal run `npx drizzle-kit push`.)
4. **Ably**: `ABLY_API_KEY` set. Without it everything still works, it just refreshes every few seconds instead of instantly.

## Using it

* Open the site, log in, press **Hehe** on the welcome note.
* Scroll to **Chat** (or press the Chat button at the top). A dot appears on it when she writes while you are elsewhere.
* Scroll to **Photo vault** → **Edit vault**. The first time, press **Bring in our original 5 photos**.
* **Arcade → Two players** → start a game. Your person sees an invite banner at the top of the arcade and taps Join.

## Changing the text or look

Everything you see is in `private-site/`. Edit `index.html` (text), `style.css` (colors, the tokens at the top), then commit. Vercel redeploys by itself.
