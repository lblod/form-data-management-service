import { querySudo as query } from '@lblod/mu-auth-sudo';

export async function waitForDatabase() {
  let up = await isDatabaseUp();
  while (!up) {
    console.log('Waiting for database to wake-up ...');
    up = await isDatabaseUp();
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function isDatabaseUp() {
  try {
    await query(`SELECT DISTINCT ?Concept WHERE {[] a ?Concept} LIMIT 100`);
    return true;
  } catch (e) {
    return false;
  }
}