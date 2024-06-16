import express from 'express';
import { getStats, getStatus } from '../controllers/AppController';
import postNew from '../controllers/UsersController';
import { getConnect, getDisconnect, getMe } from '../controllers/AuthController';
import { postUpload, getIndex, getShow } from '../controllers/FilesController';

const router = express.Router();

/**
 * method: GET
 * path: /status
 */
router.get('/status', getStatus);

/**
 * method: GET
 * path: /stats
 */
router.get('/stats', getStats);

/**
 * method: POST
 * path: /users
 */
router.post('/users', postNew);

// GET /connect => AuthController.getConnect
router.get('/connect', getConnect);

// GET /disconnect => AuthController.getDisconnect
router.get('/disconnect', getDisconnect);

// GET /users/me => UserController.getMe
router.get('/users/me', getMe);

// POST /files => FilesController.postUpload
router.post('/files', postUpload);

// GET /files => FilesController.getIndex
router.get('/files', getIndex);

// GET /files/:id => FilesController.getShow
router.get('/files/:id', getShow);

module.exports = router;
