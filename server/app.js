import express from 'express';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import { createTables } from './utils/createTables.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import { stripeSetup } from './stripeSetup.js';

const app = express();

config({ path: "./config/config.env" });

app.use(cors({
    origin: [process.env.FRONTEND_URL, 'http://localhost:5173', process.env.DASHBOARD_URL, 'http://localhost:5174'],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}));

stripeSetup(app);

app.use(cookieParser());
app.use(fileUpload({
    tempFileDir: "./tmp",
    useTempFiles: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/order", orderRoutes);

createTables();


app.use(errorMiddleware);

export default app;