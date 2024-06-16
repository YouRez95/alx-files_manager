import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// create a new file in DB and in disk
export async function postUpload(req, res) {
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

  if (parentId) {
    const { message, error } = await dbClient.findFolderById(parentId);
    if (error) {
      return res.status(400).json({ error: message });
    }
  }

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

// retrieve all users file documents for a specific parentId and with pagination
export async function getIndex(req, res) {
  const token = req.get('X-Token');
  let { parentId, page } = req.query;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const value = await redisClient.get(key);
  if (!value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!parentId) {
    parentId = 0;
  }

  if (!page) {
    page = 0;
  }
  page = Number(page);
  const files = await dbClient.findFilesByParentId(parentId, page);
  const transformedFiles = files.map((file) => {
    const { _id, ...rest } = file;
    return { id: _id, ...rest };
  });
  return res.json(transformedFiles);
}

// retrieve the file document based on the ID
export async function getShow(req, res) {
  const token = req.get('X-Token');
  const { id } = req.params;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const value = await redisClient.get(key);
  if (!value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const file = await dbClient.findFileByIdAndUserId(id, value);
  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { _id, ...rest } = file;
  return res.status(200).json({ id: _id, ...rest });
}
