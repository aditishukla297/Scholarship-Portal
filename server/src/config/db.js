import mongoose from 'mongoose';

/**
 * Connects to MongoDB.
 * Falls back to an ephemeral in-memory MongoDB when USE_MEMORY_DB=true, so the
 * portal can be demonstrated on a machine without a MongoDB installation.
 */
export async function connectDB() {
  const useMemory = String(process.env.USE_MEMORY_DB).toLowerCase() === 'true';
  let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mota_scholarship';

  if (useMemory) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('mota_scholarship');
    console.log('[db] in-memory MongoDB started (data is not persisted)');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`[db] connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}
