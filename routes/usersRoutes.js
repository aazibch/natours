const express = require('express');
const usersController = require('../controllers/usersController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// We only get a cookie, so GET HTTP verb makes sense
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// All handlers for all the routes after this code
// will run after the .protect middleware is executed.
router.use(authController.protect);

router.patch('/updateMyPassword',
    authController.updatePassword
);

router.get('/me',
    usersController.getMe,
    usersController.getUser
);

router.patch(
    '/updateMe',
    usersController.uploadUserPhoto,
    usersController.resizeUserPhoto,
    usersController.updateMe
);
router.delete('/deleteMe', usersController.deleteMe);

router.use(authController.restrictTo('admin'));

router
    .route('/')
    .get(usersController.getAllUsers)
    .post(usersController.createUser);

    router
    .route('/:id')
    .get(usersController.getUser)
    .patch(usersController.updateUser)
    .delete(usersController.deleteUser);

module.exports = router;