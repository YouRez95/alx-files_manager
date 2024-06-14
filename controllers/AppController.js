import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function getStatus(req, res) {
  const redisStatus = await redisClient.isAlive();
  const mongoStatus = dbClient.isAlive();
  res.json({ redis: redisStatus, db: mongoStatus });
}

export async function getStats(req, res) {
  const nbUsers = await dbClient.nbUsers();
  const nbFiles = await dbClient.nbFiles();

  res.json({ users: nbUsers, files: nbFiles });
}
