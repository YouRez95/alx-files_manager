import mongodb from 'mongodb';

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || '27017';
const DATABASE = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    mongodb.MongoClient.connect(`mongodb://${HOST}:${PORT}/${DATABASE}`, { useUnifiedTopology: true })
      .then((client) => {
        this.client = client.db();
      }).catch((err) => {
        console.log(err);
      });
  }

  isAlive() {
    if (this.client) {
      return true;
    }
    return false;
  }

  async nbUsers() {
    const countUsers = await this.client.collection('users').estimatedDocumentCount();
    return countUsers;
  }

  async findUserByEmail(email) {
    const user = await this.client.collection('users').findOne({ email });
    return user;
  }

  async findUserById(id) {
    const userId = new mongodb.ObjectId(id);
    const user = await this.client.collection('users').findOne({ _id: userId });
    const { password, ...rest } = user;
    return { id: rest._id, email: rest.email };
  }

  async saveUser(email, password) {
    const result = await this.client.collection('users').insertOne({ email, password });
    return result.insertedId;
  }

  async nbFiles() {
    const countFiles = await this.client.collection('files').estimatedDocumentCount();
    return countFiles;
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
