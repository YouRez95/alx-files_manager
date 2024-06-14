import express from 'express';
import { getStats, getStatus } from '../controllers/AppController';
import postNew from '../controllers/UsersController';

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

module.exports = router;
