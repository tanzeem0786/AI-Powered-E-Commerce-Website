import bcrypt from 'bcrypt';
import ErrorHandler, { errorMiddleware } from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import database from "../database/db.js";
import { sendToken } from '../utils/jwtToken.js';

export const register = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return next(new ErrorHandler("Please Provide All Required Fields!", 400));
    }
    if (!email.includes('@') || email[0] === '@') {
        return next(new ErrorHandler("Invalid Email!", 400));
    }
    if (password.length < 8 || password.length > 16) {
        return next(new ErrorHandler("Password Must be Between 8 and 16 Characters!", 400));
    }
    const isAlreadyRegistered = await database.query(
        `SELECT * FROM users WHERE email = $1`, [email]
    );
    if (isAlreadyRegistered.rows.length > 0) {
        return next(new ErrorHandler("User is Already Registered!", 400));
    }
    const hashedpassword = await bcrypt.hash(password, 10);
    const user = await database.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
        [name, email, hashedpassword]
    );
    /*------ALTERNATE OPTION TO INSERT DATA(but is very risky for SQL injections)------*/
    // const user = await database.query(
    //     `INSERT INTO users (name, email, password) VALUES (${name}, ${email}, ${hashedpassword}) RETURNING *`,
    //     [name, email, hashedpassword]
    // );
    sendToken(user.rows[0], 201, "User Registered Successfully.", res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new ErrorHandler("Please Provide all Fields!", 400));
    }
    if (!email.includes('@')) {
        return next(new ErrorHandler("Invalid Email!", 400));
    }
    if (password.length < 8 || password.length > 16) {
        return next(new ErrorHandler("Password Must be Between 8 and 16 Characters!", 400));
    }
    const user = await database.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    if (user.rows.length === 0) {
        return next(new ErrorHandler("Invalid Email or Password!", 401));
    }
    const isPasswordMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Incorrect Password!", 400));
    }
    sendToken(user.rows[0], 200, "Login Successfully.", res);

});

export const getUser = catchAsyncErrors(async (req, res, next) => { 
    
});

export const logout = catchAsyncErrors(async (req, res, next) => { });