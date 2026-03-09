import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

// Allow build to succeed without DATABASE_URL (will fail at runtime if missing)
export const sql = neon(databaseUrl || 'postgresql://placeholder:placeholder@localhost/placeholder');
