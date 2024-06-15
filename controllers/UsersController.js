import sha1 from 'sha1';
import dbClient from '../utils/db';

export default async function postNew(req, res) {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Missing password' });
  }

  if (await dbClient.findUserByEmail(email)) {
    return res.status(400).json({ error: 'Already exist' });
  }

  const hashedPassword = sha1(password);
  const userId = await dbClient.saveUser(email, hashedPassword);
  if (!userId) {
    return res.status(400).json({ error: 'Something wrong try again later' });
  }
  return res.json({ id: userId, email });
}
