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

  async nbFiles() {
    const countFiles = await this.client.collection('files').estimatedDocumentCount();
    return countFiles;
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
