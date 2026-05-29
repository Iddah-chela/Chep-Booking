#!/usr/bin/env node
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import AgentVacancy from './models/agentVacancy.js';

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

const now = new Date();
const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);

const baseOrFilters = [
  { expiresAt: { $lte: now } },
  { status: 'expired' },
];

const query = { $or: baseOrFilters };
if (agentId) query.agent = agentId;
if (Number.isFinite(olderThanDays) && olderThanDays > 0) {
  query.createdAt = { $lte: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) };
}

const update = {
  $set: {
    isActive: true,
    status: 'open',
    contactedAt: null,
    expiresAt: farFuture,
  },
};

const findTtlIndexes = async () => {
  const indexes = await AgentVacancy.collection.indexes();
  return indexes.filter((idx) => idx && idx.key && idx.key.expiresAt === 1 && typeof idx.expireAfterSeconds === 'number');
};

async function main() {
  console.log('Starting agent vacancy migration');
  console.log('Mode:', applyChanges ? 'APPLY' : 'DRY-RUN');
  console.log('Query:', JSON.stringify(query));

  await connectDB();

  const matchingCount = await AgentVacancy.countDocuments(query);
  console.log('Matching vacancies:', matchingCount);

  const sample = await AgentVacancy.find(query)
    .select('_id agent isActive status expiresAt createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  if (sample.length > 0) {
    console.log('Sample vacancy ids:', sample.map((v) => String(v._id)).join(', '));
  }

  const ttlIndexes = await findTtlIndexes();
  if (ttlIndexes.length === 0) {
    console.log('No TTL index found on expiresAt.');
  } else {
    console.log('TTL indexes on expiresAt:', ttlIndexes.map((i) => i.name).join(', '));
  }

  if (!applyChanges) {
    console.log('Dry run complete. Re-run with --apply to execute updates and drop TTL indexes.');
    process.exit(0);
  }

  const result = await AgentVacancy.updateMany(query, update);
  console.log('Updated vacancies:', result.modifiedCount);

  for (const idx of ttlIndexes) {
    try {
      await AgentVacancy.collection.dropIndex(idx.name);
      console.log(`Dropped TTL index: ${idx.name}`);
    } catch (error) {
      console.warn(`Failed to drop index ${idx.name}:`, error.message || error);
    }
  }

  console.log('Migration completed.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Migration failed:', error.message || error);
  process.exit(1);
});
