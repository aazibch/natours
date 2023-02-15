const express = require('express');
const router = express.Router({ mergeParams: true });

const reviewsController = require('../controllers/reviewsController');
const authController = require('../controllers/authController');

// POST /tour/[tourId]/reviews
// GET /tour/[tourId]/reviews
// POST /reviews

router.use(authController.protect);

router
	.route('/')
	.get(reviewsController.getAllReviews)
	.post(
		authController.restrictTo('user'),
		reviewsController.setTourUserIds,
		reviewsController.createReview
	);

router
	.route('/:id')
	.get(reviewsController.getReview)
	.patch(
		authController.restrictTo('user', 'admin'),
		reviewsController.updateReview
	)
	.delete(
		authController.restrictTo('user', 'admin'),
		reviewsController.deleteReview
	);

module.exports = router;