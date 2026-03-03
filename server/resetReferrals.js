import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://zakuwantungsten:HAMDUNASSOR@cluster0.5tzevxf.mongodb.net/house-booking?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGO_URI);
  const result = await mongoose.connection.db.collection('users').updateMany(
    {},
    {
      $set: { referralCount: 0, referralUnlocks: 0, referralUnlocksUsed: 0 },
      $unset: { referredBy: 1 }
    }
  );
  console.log('Reset referral data for', result.modifiedCount, 'users');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
