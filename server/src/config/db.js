import mongoose from 'mongoose';

/**
 * Connects to MongoDB.
 *
 * On a serverless platform the module is re-evaluated on cold start but the
 * process may be reused across invocations, so the connection (and the promise
 * that creates it) is cached on globalThis. Without this, every request would
 * open a new pool and the Atlas connection limit would be exhausted quickly.
 */
const cache = globalThis.__motaMongoose ?? (globalThis.__motaMongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const useMemory = String(process.env.USE_MEMORY_DB).toLowerCase() === 'true';
    let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mota_scholarship';

    if (useMemory) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mem = await MongoMemoryServer.create();
      uri = mem.getUri('mota_scholarship');
      console.log('[db] in-memory MongoDB started (data is not persisted)');
    }

    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000,
        // Keep the pool small: many concurrent serverless instances share the cluster.
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log(`[db] connected: ${m.connection.name}`);
        return m.connection;
      })
      .catch((err) => {
        cache.promise = null; // allow a retry on the next invocation
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
