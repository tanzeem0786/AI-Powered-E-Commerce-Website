class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
};

export const errorMiddleware = (err, req, res, next) => {
    err.message = err.message || "Interal Server Error!";
    err.statusCode = err.statusCode || 500;

    if (err.code === 11000) {
        const message = "Duplicate Field Value Entered!";
        err = new ErrorHandler(message, 400);
    }

    if (err.name === "JsonWebTokenError") {
        const message = "JSON Web Token is invalid. try again!";
        err = new ErrorHandler(message, 400);
    }

    if(err.name === "TokenExpiredError") {
        const message = "JSON Web Token has expired! Try again."
    }

    const errorMessage = err.errors ? Object.values(err.errors).map((error) => error.message).join(" ") : err.message;
    // console.log("Error Middleware :", err);

    return res.status(err.statusCode).json({
        success: false,
        message: errorMessage,
    })

}

export default ErrorHandler;