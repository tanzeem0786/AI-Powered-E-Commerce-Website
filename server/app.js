import express from 'express';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import cors from 'cors';

const app = express();

config({path: "./config/config.env"});

app.use(cors({
    origin: [process.env.FRONTEND_URL, 'http://localhost:5173', process.env.DASHBOARD_URL, 'http://localhost:5174']
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));




export default app;