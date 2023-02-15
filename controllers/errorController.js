const AppError = require('../utils/appError');

const handleCastErrorDb = err => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDb = err => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value.`;

    return new AppError(message, 400);
};

const handleValidationErrorDb = err => {
    // const errMessages = [];

    // for (let i in err.errors) {
    //     errMessages.push(err.errors[i].message);
    // }

    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid input data. ${errors.join(' ')}`;
    return new AppError(message, 400);
};

const handleJwtError = () => new AppError('Invalid token.', 401);

const handleJwtExpiredError = () => new AppError('Your token has expired.', 401);

const sendErrorDev = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
    
    // B) RENDERED WEBSITE
    console.error('ERROR', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    });
};

const sendErrorProd = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        // A) API

        // A) Operational: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }

        // B) Programming or unknown error: don't disclose error details
        // 1) Log error
        console.error('ERROR', err);

        // 2) Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong!'
        });
    }

    // B) RENDERED WEBSITE

    // A) Operational: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }

    // B) Programming or unknown error: don't disclose error details
    // 1) Log error
    console.error('ERROR', err);

    // 2) Send generic message
    return res.status(500).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        // For some reason the message property is not copied.
        let error = { ...err };
        // Copying manually
        error.message = err.message;

        if (error.name === 'CastError') error = handleCastErrorDb(error);
        if (error.code === 11000) error = handleDuplicateFieldsDb(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDb(error);
        // Invalid token
        if (error.name === 'JsonWebTokenError') error = handleJwtError();
        
        // Expired token
        if (err.name === 'TokenExpiredError') error = handleJwtExpiredError();

        sendErrorProd(error, req, res);
    }
};