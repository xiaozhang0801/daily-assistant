import Database from "better-sqlite3";
import { schemaSql } from "./schema";

export type AppDatabase = Database.Database;

export function createDatabase(filePath: string): AppDatabase {
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.exec(schemaSql);
  return db;
}

export function createInMemoryDatabase(): AppDatabase {
  const db = new Database(":memory:");
  db.exec(schemaSql);
  return db;
}
