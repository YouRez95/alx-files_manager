import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function getConnect(req, res) {
  const base64Encoded = req.get('Authorization');
  if (!base64Encoded || base64Encoded.split(' ')[0] !== 'Basic') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [, base64] = base64Encoded.split(' ');
  let base64Decoded;
  try {
    base64Decoded = Buffer.from(base64, 'base64').toString();
  } catch (err) {
    return res.status(404).json({ error: 'Invalid Base64' });
  }
  // TODO:
  // To fix later if the password contain :
  const [email, password] = base64Decoded.split(':');
  const user = await dbClient.findUserByEmail(email);

  if (!user || sha1(password) !== user.password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Generate key and token
  const token = uuidv4();
  const key = `auth_${token}`;
  await redisClient.set(key, String(user._id), 24 * 3600);
  return res.status(200).json({ token });
}

export async function getDisconnect(req, res) {
  const token = req.get('X-Token');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const value = await redisClient.get(key);
  if (!value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await redisClient.del(key);
  return res.sendStatus(204);
}

export async function getMe(req, res) {
  const token = req.get('X-Token');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const value = await redisClient.get(key);
  if (!value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await dbClient.findUserById(value);
  return res.json(user);
}
