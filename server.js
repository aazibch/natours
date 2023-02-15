const mongoose = require('mongoose');
require('dotenv').config();

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

const app = require('./app');

const databaseString = process.env.DB.replace(
    '<password>',
    process.env.DB_PASS
);

mongoose.connect(databaseString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => console.log('Connected to database...'));

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    }); 
});

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED! Shutting down...');

    server.close(() => {
        console.log('Server stopped.');
    })
})