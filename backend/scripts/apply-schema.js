// Prisma migrate ne sait pas générer les extensions PostGIS ni les triggers PL/pgSQL.
// On applique donc schema.sql directement, puis on fait juste `prisma generate`
// (pas `prisma migrate dev`) pour que le client Prisma matche le schéma réel.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../../schema.sql'), 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const existing = await client.query("SELECT to_regclass('public.users') AS table_name");
  if (existing.rows[0].table_name) {
    console.log('Le schéma SUPSTAR existe déjà, aucune réinitialisation effectuée.');
    await client.end();
    return;
  }
  console.log('Application de schema.sql...');
  await client.query(sql);
  console.log('Schéma appliqué avec succès.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
