import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {v2 as cloudinary} from 'cloudinary';
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import database from "../database/db.js";
import { sendToken } from '../utils/jwtToken.js';
import { generateResetPasswordToken } from '../utils/generateResetPasswordToken.js';
import { generateEmailTemplate } from '../utils/generateForgotPasswordEmailTemplate.js';
import { sendEmail } from '../utils/sendEmail.js';


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
    const { user } = req;
    res.status(200).json({
        success: true,
        user,
    })
});

export const logout = catchAsyncErrors(async (req, res, next) => {
    res.status(200).cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).json({
        success: true,
        message: "Logged Out Successfully."
    })
});

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const { email } = req.body;
    const { frontendUrl } = req.query;

    const userResult = await database.query(
        "SELECT * FROM users WHERE email = $1", [email]
    );

    if (userResult.rows.length === 0) {
        return next(new ErrorHandler("User not Found with This Email!", 404));
    }

    const user = userResult.rows[0];
    const { resetToken, hashedToken, resetPasswordExpireTime } = generateResetPasswordToken();
    await database.query(
        "UPDATE users SET reset_password_token = $1, reset_password_expire = to_timestamp($2) WHERE email = $3", [hashedToken, resetPasswordExpireTime / 1000, email]
    );
    const resetPasswordUrl = `${frontendUrl}/password/reset/${resetToken}`;
    const message = generateEmailTemplate(resetPasswordUrl);

    try {
        await sendEmail({
            email: user.email,
            subject: "E-Commerce Password Recovery",
            message,
        });
        res.status(200).json({
            success: true,
            message: `Email Sent to ${user.email} Successfully.`,
        });
    } catch (error) {
        await database.query(
            "UPDATE users SET reset_password_token = NULL, reset_password_expire = NULL WHERE email = $1", [email]
        );
        return next(new ErrorHandler("Email Could not be Sent!", 500));
    }
});

export const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.params;
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await database.query(
        "SELECT * FROM users WHERE reset_password_token = $1 AND  reset_password_expire > NOW()", [resetPasswordToken]
    );
    if (user.rows.length === 0) {
        return next(new ErrorHandler("Invalid or Expired Reset Token", 400));
    }
    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password do no Match!", 400));
    }
    if (
        req.body.password?.length < 8 ||
        req.body.password?.length > 16 ||
        req.body.confirmPassword?.length < 8 ||
        req.body.confirmPassword?.length > 16
    ) {
        return next(new ErrorHandler("Password Must be Between 8 and 16 Characters!", 400));
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const updatedUser = await database.query(
        "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expire = NULL WHERE id = $2 RETURNING *", [hashedPassword, user.rows[0].id]
    );
    sendToken(updatedUser, 200, "Password Reset Successfully.", res);

});

export const updatePassword = catchAsyncErrors(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please Provide All Required Fields!", 400));
    }
    const isPasswordMatched = await bcrypt.compare(currentPassword, req.user.password);
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Current Password is Incorrect!", 400));
    }
    if (newPassword !== confirmNewPassword) {
        return next(new ErrorHandler("New Password and Confirm Password Doesn't Matched!", 400));
    }
    if (
        newPassword.length < 8 ||
        newPassword.length > 16 ||
        confirmNewPassword.length < 8 ||
        confirmNewPassword.length > 16
    ) {
        return next(new ErrorHandler("Password Must be 8 and 16 Characters!", 400));
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await database.query(
        "UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, req.user.id]
    );
    res.status(200).json({
        success: true,
        message: "Password Update Successfully",
    });
});

export const updateProfile = catchAsyncErrors(async(req, res, next) => {
    const {name, email} = req.body;
    if(!name || !email) {
        return next(new ErrorHandler("Please Provide All Required Fields!",400));
    }
    if(name.trim().length === 0 || email.trim().length === 0) {
        return next(new ErrorHandler("Name and Email Can't be Empty!",400));
    }
    let avatarData = {};
    if(req.files && req.files.avatar){
        const {avatar} = req.files;
        if(req.user?.avatar?.public_id) {
            await cloudinary.uploader.destroy(req.user.avatar.public_id);
        }
        const newProfileImage = await cloudinary.uploader.upload(avatar.tempFilePath, {
            folder: "Ecommerce_Avatar",
            width: 150,
            crop: "scale",
        });
        avatarData = {
            public_id: newProfileImage.public_id,
            url: newProfileImage.secure_url,
        };
    }

    let user; 
    if(Object.keys(avatarData).length === 0) {
        user = await database.query(
            "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
            [name, email, req.user.id]
        );
    } else {
        user = await database.query(
            "UPDATE users SET name = $1, email = $2, avatar = $3 WHERE id = $4 RETURNING *",
            [name, email, avatarData, req.user.id]
        );
    }

    res.status(200).json({
        success: true,
        message: "Profile Updated Successfully.",
        user: user.rows[0],
    });

});