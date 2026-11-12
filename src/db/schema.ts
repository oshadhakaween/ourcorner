import { pgTable, serial, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(), // Clerk user id
  senderName: text("sender_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  game: text("game").notNull(), // "tictactoe" | "connect4"
  hostId: text("host_id").notNull(),
  guestId: text("guest_id"),
  state: jsonb("state").notNull(), // board, scores, etc.
  turn: text("turn"), // Clerk id of whose move it is
  status: text("status").notNull().default("waiting"), // waiting | playing | finished
  winner: text("winner"), // Clerk id, "draw", or null
  version: integer("version").notNull().default(0), // stops double moves
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(), // file path inside the R2 bucket
  uploaderId: text("uploader_id").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
