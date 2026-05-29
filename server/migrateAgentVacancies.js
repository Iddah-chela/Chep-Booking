#!/usr/bin/env node
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { runAgentVacancyMigration } from './utils/agentVacancyMigration.js';

dotenv.config({ path: './.env' });

const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');

const getArgValue = (name) => {
  const exact = args.find((a) => a.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = args.findIndex((a) => a === name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return null;
};

const agentId = getArgValue('--agent');
const olderThanDaysRaw = getArgValue('--older-than-days');
const olderThanDays = olderThanDaysRaw ? Number(olderThanDaysRaw) : null;

async function main() {
  console.log('Starting agent vacancy migration');
  console.log('Mode:', applyChanges ? 'APPLY' : 'DRY-RUN');

  await connectDB();

  const result = await runAgentVacancyMigration({
    applyChanges,
    agentId,
    olderThanDays,
    dropTtlIndexes: true,
  });

  console.log('Query:', JSON.stringify(result.query));
  console.log('Matching vacancies:', result.matchingCount);
  if (result.sampleIds.length > 0) {
    console.log('Sample vacancy ids:', result.sampleIds.join(', '));
  }

  if (result.ttlIndexNames.length === 0) {
    console.log('No TTL index found on expiresAt.');
  } else {
    console.log('TTL indexes on expiresAt:', result.ttlIndexNames.join(', '));
  }

  if (!applyChanges) {
    console.log('Dry run complete. Re-run with --apply to execute updates and drop TTL indexes.');
    process.exit(0);
  }

  console.log('Updated vacancies:', result.modifiedCount);
  if (result.droppedIndexes.length > 0) {
    console.log('Dropped TTL indexes:', result.droppedIndexes.join(', '));
  }
  if (result.failedDrops.length > 0) {
    for (const failed of result.failedDrops) {
      console.warn(`Failed to drop index ${failed.name}:`, failed.error);
    }
  }

  console.log('Migration completed.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Migration failed:', error.message || error);
  process.exit(1);
});
