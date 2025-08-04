import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  // Assuming schema files are located in src/lib/db/schema.ts
  // If this file does not exist, it will need to be created.
  schema: './src/lib/db/schema.ts',
  out: './migrations', // Directory where migration files will be generated
  dialect: 'sqlite', // Use 'sqlite' for a local SQLite database
  log: true, // Enable logging of SQL statements
  dbCredentials: {
    // Explicitly provide the absolute path for Drizzle Kit CLI
    url: process.env.DATABASE_URL ?? 'sqlite:/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.data/db.sqlite',
  },
});