class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        // This way when a new AppError object is created the constructor function is called
        // that function call is not going to appear in the stack trace. 
        // (after testing, this doesn't seem necessary.)
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;