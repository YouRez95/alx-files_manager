import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// create a new file in DB and in disk
export default async function postUpload(req, res) {
  const token = req.get('X-Token');
  const { name, type, data } = req.body;
  let { parentId, isPublic } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }
  const acceptedTypes = ['folder', 'file', 'image'];
  if (!type || !acceptedTypes.includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }

  if (type !== 'folder' && !data) {
    return res.status(400).json({ error: 'Missing data' });
  }
  // TODO: If the parentId is set
  if (!parentId) {
    parentId = 0;
  }

  if (!isPublic) {
    isPublic = false;
  }

  const key = `auth_${token}`;
  const value = await redisClient.get(key);
  if (!value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(value);

  if (type === 'folder') {
    const fileData = {
      userId: user.id,
      name,
      type,
      isPublic,
      parentId,
    };
    const fileId = await dbClient.saveFile(fileData);
    const { _id, ...rest } = { id: fileId, ...fileData };
    return res.status(201).json({ ...rest });
  }

  const path = process.env.FOLDER_PATH || '/tmp/files_manager';

  const fullPath = `${path}/${uuidv4()}`;
  const dataDecoded = Buffer.from(data, 'base64').toString();
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
  fs.writeFile(fullPath, dataDecoded, 'utf-8', (err) => {
    if (err) throw err;
  });
  const fileData = {
    userId: user.id,
    name,
    type,
    isPublic,
    parentId,
    localPath: fullPath,
  };
  const fileId = await dbClient.saveFile(fileData);
  const { _id, localPath, ...rest } = { id: fileId, ...fileData };
  return res.status(201).json({ ...rest });
}
