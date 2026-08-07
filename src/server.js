import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { connectDB } from './database/db.js';
import logger from './shared/logger/logger.js';
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Enterprise URL Platform Server active on port: ${PORT}`);
      logger.info(`Swagger API Docs available at: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
};

startServer();