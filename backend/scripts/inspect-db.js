
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pool from "../src/config/db.js";

async function inspectDatabase() {
  try {
    const database = await pool.query(`
      SELECT current_database() AS database_name,
             current_schema() AS current_schema
    `);

    const tables = await pool.query(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const columns = await pool.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const constraints = await pool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.constraint_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type
    `);

    const indexes = await pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const report = {
      database: database.rows,
      tables: tables.rows,
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
      inspectedAt: new Date().toISOString()
    };

    const outputPath = path.resolve("database-inspection.json");

    fs.writeFileSync(
      outputPath,
      JSON.stringify(report, null, 2),
      "utf8"
    );

    console.log("\nDatabase inspection completed successfully.");
    console.log("Tables found:", tables.rowCount);
    console.log("Columns found:", columns.rowCount);
    console.log("Constraints found:", constraints.rowCount);
    console.log("Indexes found:", indexes.rowCount);
    console.log("\nReport saved to:", outputPath);

  } catch (error) {
    console.error("Database inspection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

inspectDatabase();