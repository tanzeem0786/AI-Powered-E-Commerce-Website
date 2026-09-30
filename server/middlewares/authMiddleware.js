import jwt from "jsonwebtoken";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "./errorMiddleware.js";
import database from '../database/db.js';

export const isAuthenticated = catchAsyncErrors(async(req, res, next) => {
    const {token} = req.cookies;
    if(!token) {
        return next(new ErrorHandler("Please Login to Access This Resources!", 401));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await database.query(
        "SELECT * FROM users WHERE id = $1 LIMIT 1", [decoded.id]
    )
    if (user.rows.length === 0) {
        return next(new ErrorHandler("User no longer exists.", 401));
    }
    req.user = user.rows[0];
    next();
});

export const isAuthorized = (...roles) => {
    return (req, res, next) => {
        if(!req.user || !roles.includes(req.user.role)){
            return next(new ErrorHandler(`User With This Role (${req.user.role}) can't Access This Resource!`, 403));
        }
        next();
    };
};