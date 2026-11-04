import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { MEME_STATUSES, type Caption } from './memes.types';

export const memeStatusEnum = pgEnum('meme_status', MEME_STATUSES);

export const memes = pgTable(
  'memes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    captions: jsonb('captions').$type<Caption[]>().notNull(),
    imagePublicId: text('image_public_id').notNull(),
    imageUrl: text('image_url').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    status: memeStatusEnum('status').notNull().default('ready'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('memes_created_at_id_idx').on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export type MemeRow = typeof memes.$inferSelect;
export type NewMemeRow = typeof memes.$inferInsert;
