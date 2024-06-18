import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import readFile from '../utils/readFile';

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
  const parentId = req.query.parentId || 0;
  const page = Number(req.query.page) || 0;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const value = await redisClient.get(key);
  if (!value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(value);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const files = await dbClient.findFilesByParentId(parentId, page, user.id);
  const transformedFiles = files.map((file) => {
    const { _id, localPath, ...rest } = file;
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
  const user = await dbClient.findUserById(value);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const file = await dbClient.findFileByIdAndUserId(id, user.id);
  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { _id, ...rest } = file;
  return res.status(200).json({ id: _id, ...rest });
}

// should set isPublic to true on the file document based on the ID
export async function putPublish(req, res) {
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
  const user = await dbClient.findUserById(value);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const file = await dbClient.updateFile(id, true);
  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { _id, localPath, ...rest } = file;
  return res.json({ id: _id, ...rest });
}

// should set isPublic to false on the file document based on the ID
export async function putUnpublish(req, res) {
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
  const user = await dbClient.findUserById(value);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const file = await dbClient.updateFile(id, false);
  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { _id, localPath, ...rest } = file;
  return res.json({ id: _id, ...rest });
}

// should return the content of the file document based on the ID
export async function getFile(req, res) {
  const { id } = req.params;
  const token = req.get('X-Token');

  // find the file from DB
  const file = await dbClient.findFileById(id);

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (file.isPublic && file.type !== 'folder') {
    // TODO: return the content of the file if exist
    const type = mime.lookup(file.name);
    try {
      const data = await readFile(file.localPath);
      res.setHeader('Content-Type', type);
      return res.send(data);
    } catch (err) {
      return res.json({ error: 'Not found' });
    }
  }

  if (!token) {
    return res.status(404).json({ error: 'Not found' });
  }
  const key = `auth_${token}`;
  const value = await redisClient.get(key);
  if (!value) {
    return res.status(404).json({ error: 'Not found' });
  }
  const user = await dbClient.findUserById(value);
  if (!user || String(user.id) !== String(file.userId)) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (file.type === 'folder') {
    return res.status(400).json({ error: 'A folder doesn\'t have content' });
  }

  const type = mime.lookup(file.name);
  try {
    const data = await readFile(file.localPath);
    res.setHeader('Content-Type', type);
    return res.send(data);
  } catch (err) {
    return res.json({ error: 'Not found' });
  }
}
