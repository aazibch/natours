const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION_TIME,
    });
};

const createSendToken = (user, statusCode, req, res) => {
    const token = signToken(user._id);

    res.cookie("jwt", token, {
        expires: new Date(
            Date.now() +
                process.env.JWT_COOKIE_EXPIRATION_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    });

    // Don't show password property
    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            user,
        },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
    });

    // Since the url is going to different depending on the environment,
    // we're going get it through the "req" object

    const url = `${req.protocol}://${req.get("host")}/me`;
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(
            new AppError("Please provide the email and password.", 400)
        );
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError("Incorrect email or password.", 401));
    }

    createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
    res.cookie("jwt", "loggedout", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({ status: "success" });
};

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError("You're not logged in.", 401));
    }

    // 2) Verfying token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Checking if user still exists.
    const user = await User.findById(decoded.id);

    if (!user) {
        return next(
            new AppError(
                "The user that the token was issued to no longer exists.",
                401
            )
        );
    }

    // 4) Checking if user changed password after token was issued.
    if (user.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                "User changed his password after token was issued.",
                401
            )
        );
    }

    req.user = user;
    res.locals.user = user;
    next();
});

// Only for rendered pages
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            token = req.cookies.jwt;

            // 1) Verify token
            const decoded = await promisify(jwt.verify)(
                token,
                process.env.JWT_SECRET
            );

            // 2) Checking if user still exists.
            const user = await User.findById(decoded.id);

            if (!user) {
                return next();
            }

            // 4) Checking if user changed password after token was issued.
            if (user.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // There is a logged in user
            res.locals.user = user;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You don't have permission to perform this action.",
                    403
                )
            );
        }

        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email.
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(
            new AppError("There is no user with that email address.", 404)
        );
    }

    // 2) Generate random reset token.
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to the user's email.
    const resetUrl = `${req.protocol}://${req.get(
        "host"
    )}/api/v1/users/resetPassword/${resetToken}`;

    try {
        await new Email(user, resetUrl).sendPasswordReset();
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                "There was an error sending the email. Try again later!",
                500
            )
        );
    }

    res.status(200).json({
        status: "success",
        message: "Token sent to email.",
    });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token.
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired and a user was found.

    if (!user) {
        return next(new AppError("Token is invalid or has expired.", 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // 3) Update changedPasswordAt property for the user (done using middleware)

    // 4) Log the user in, send JWT token.
    createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user._id).select("+password");

    // 2) Check if the POSTed password is correct.
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError("Invalid value for current password.", 401));
    }

    // 3) If so, update the password.
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4) Log user in, send JWT
    createSendToken(user, 200, req, res);
});
