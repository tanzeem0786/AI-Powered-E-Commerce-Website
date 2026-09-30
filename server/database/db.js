import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const configPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../config/config.env');
dotenv.config({ path: configPath });

const {Client} = pkg;

const database = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT,
});

try {
    await database.connect();
    console.log("Database Connected Successfully.");
} catch (error) {
    console.log("Error to Connecting Database:", error);
    process.exit(1);
}

export default database;