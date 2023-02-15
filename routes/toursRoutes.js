const express = require('express');
const toursController = require('../controllers/toursController');
const authController = require('../controllers/authController');
const reviewRouter = require('../routes/reviewsRoutes')

const router = express.Router();

// router.param('id', toursController.checkId);

// POST /tour/[tour id]/reviews
// GET /tour/[tour id]/reviews
// GET /tour/[tour id]/reviews/[review id]

router.use('/:tourId/reviews', reviewRouter);

router
    .route('/top-5-cheap')
    .get(toursController.aliasTopTours, toursController.getAllTours);

router
    .route('/tour-stats')
    .get(toursController.getTourStats);

router
    .route('/monthly-plan/:year')
    .get(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide', 'guide'),
        toursController.getMonthlyPlan
    );

router
    .route('/tours-within/:distance/center/:latlong/unit/:unit')
    .get(toursController.getToursWithin);

router
    .route('/distances/:latlong/unit/:unit')
    .get(toursController.getDistances);

router
    .route('/')
    .get(toursController.getAllTours)
    .post(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        toursController.createTour
    );

router
    .route('/:id')
    .get(toursController.getTour)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        toursController.uploadTourImages,
        toursController.resizeTourImages,
        toursController.updateTour
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        toursController.deleteTour
    );

module.exports = router;