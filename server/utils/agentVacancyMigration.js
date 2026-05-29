import AgentVacancy from '../models/agentVacancy.js';

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

export const buildAgentVacancyMigrationQuery = ({ now = new Date(), agentId = null, olderThanDays = null } = {}) => {
  const query = {
    $or: [
      { expiresAt: { $lte: now } },
      { status: 'expired' },
    ],
  };

  if (agentId) {
    query.agent = agentId;
  }

  if (Number.isFinite(olderThanDays) && Number(olderThanDays) > 0) {
    query.createdAt = { $lte: new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000) };
  }

  return query;
};

export const findAgentVacancyTtlIndexes = async () => {
  const indexes = await AgentVacancy.collection.indexes();
  return indexes.filter((idx) => idx && idx.key && idx.key.expiresAt === 1 && typeof idx.expireAfterSeconds === 'number');
};

export const runAgentVacancyMigration = async ({
  applyChanges = false,
  agentId = null,
  olderThanDays = null,
  dropTtlIndexes = true,
  now = new Date(),
} = {}) => {
  const query = buildAgentVacancyMigrationQuery({ now, agentId, olderThanDays });
  const farFuture = new Date(Date.now() + TEN_YEARS_MS);

  const matchingCount = await AgentVacancy.countDocuments(query);
  const sample = await AgentVacancy.find(query)
    .select('_id agent isActive status expiresAt createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const ttlIndexes = await findAgentVacancyTtlIndexes();

  const result = {
    query,
    matchingCount,
    sampleIds: sample.map((v) => String(v._id)),
    ttlIndexNames: ttlIndexes.map((i) => i.name),
    modifiedCount: 0,
    droppedIndexes: [],
    failedDrops: [],
    applyChanges,
  };

  if (!applyChanges) {
    return result;
  }

  const updateResult = await AgentVacancy.updateMany(
    query,
    {
      $set: {
        isActive: true,
        status: 'open',
        contactedAt: null,
        expiresAt: farFuture,
      },
    }
  );

  result.modifiedCount = updateResult.modifiedCount || 0;

  if (dropTtlIndexes) {
    for (const idx of ttlIndexes) {
      try {
        await AgentVacancy.collection.dropIndex(idx.name);
        result.droppedIndexes.push(idx.name);
      } catch (error) {
        result.failedDrops.push({ name: idx.name, error: error.message || String(error) });
      }
    }
  }

  return result;
};
