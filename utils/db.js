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

  async saveFile(fileData) {
    const result = await this.client.collection('files').insertOne(fileData);
    return result.insertedId;
  }

  async findFileByIdAndUserId(id, userId) {
    const fileId = new mongodb.ObjectId(id);
    const file = await this.client.collection('files').findOne({ _id: fileId, userId });

    return file;
  }

  async findFolderById(id) {
    const fileId = new mongodb.ObjectId(id);
    const file = await this.client.collection('files').findOne({ _id: fileId });
    if (!file) {
      return { message: 'Parent not found', error: true };
    }
    const { type } = file;
    if (type !== 'folder') {
      return { message: 'Parent is not a folder', error: true };
    }
    return { message: 'success', error: false };
  }

  async findFilesByParentId(parentId, page) {
    const pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      { $limit: 20 },
    ];
    const files = await this.client.collection('files').aggregate(pipeline).toArray();
    return files;
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
