import express from 'express';
import appRoutes from './routes/index';

const app = express();

// Middelwares
app.use(express.json());

app.use('/', appRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server is listenning on port ${PORT}`));
