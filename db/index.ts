// Drizzle schema is used only as a type source for db/schema.ts — no live connection.
// All queries go through @supabase/supabase-js in lib/supabase/.
export * from './schema'
