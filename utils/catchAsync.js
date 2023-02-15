module.exports = fn => {
    return (req, res, next) => {
        // passing err => next(err)
        // or next
        // is the same.
        fn(req, res, next).catch(next);
    }
}