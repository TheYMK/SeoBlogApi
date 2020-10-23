// ============================================================
//                  Importations
// ============================================================

const express = require('express'),
	morgan = require('morgan'), // So that we get a log of our requests in the console
	bodyParser = require('body-parser'), // for parsing incoming data to json format
	cookieParser = require('cookie-parser'), // for parsing incoming data to json format
	cors = require('cors'), // to avoid cross origin errors because our app will run on two different port
	mongoose = require('mongoose');
require('dotenv').config(); // for environment variable

// routes importation
const blogRoutes = require('./routes/api/blog');
const authRoutes = require('./routes/api/auth');
const userRoutes = require('./routes/api/user');
const categoryRoutes = require('./routes/api/category');
const tagRoutes = require('./routes/api/tag');
const formRoutes = require('./routes/api/form');
// initialize express app
const app = express();

// ============================================================
//                    Database Connection
// ============================================================

mongoose
	.connect(process.env.DATABASE_CLOUD, {
		useNewUrlParser: true,
		useCreateIndex: true,
		useFindAndModify: false,
		useUnifiedTopology: true
	})
	.then(() => console.log('====> DATABASE CONNECTED'));

// ============================================================
//                   Middlewares
// ============================================================
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());

// cors - (works only in browser to browser communication)
if (process.env.NODE_ENV === 'development') {
	app.use(cors({ origin: `${process.env.CLIENT_URL}` }));
}

// ============================================================
//                      Route Middlewares
// ============================================================
app.use('/api', blogRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', categoryRoutes);
app.use('/api', tagRoutes);
app.use('/api', formRoutes);
// ============================================================
//                          Server
// ============================================================

// port
const port = process.env.PORT || 8000;

app.listen(port, () => {
	console.log(`====> Server running on port ${port}...`);
});
