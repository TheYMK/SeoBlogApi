const User = require('../models/user');
const shortId = require('shortid');
const jwt = require('jsonwebtoken'); //To create token
const expressJwt = require('express-jwt'); // To check if token is valid or has expired
const Blog = require('../models/blog');
const { errorHandler } = require('../helpers/dbErrorHandler');
const _ = require('lodash');
const { OAuth2Client } = require('google-auth-library');

// nodemailer
const { sendEmailWithNodemailer } = require('../helpers/email');

// preSignup controller
exports.preSignup = (req, res) => {
	const { name, email, password } = req.body;

	User.findOne({ email: email.toLowerCase() }, (err, foundUser) => {
		if (foundUser) {
			return res.status(400).json({
				error: 'Email is already taken'
			});
		}

		const token = jwt.sign({ name, email, password }, process.env.JWT_ACCOUNT_ACTIVATION, { expiresIn: '10m' });

		// Once we generate the token we need to send an email with this token to the user
		const emailData = {
			from: process.env.EMAIL_NOREPLY, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
			to: email, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
			subject: `Account activation link`,
			html: `
			<h4>Please use the following link to verify and activate your account:</h4>
			<p>${process.env.CLIENT_URL}/auth/account/activate/${token}</p>
			<hr />
			<p>This email may contain sensitive information. Please do not reply to this email.</p>
			<p>https://kaymkassai.tech</p>
		`
		};

		sendEmailWithNodemailer(req, res, emailData);
		res.json({
			message: `Email has been sent to ${email}. Follow the instructions to activate your account.`
		});
		// in frontend show this message: Email has been sent to ${email}. Follow the instructions to activate your account.
	});
};

// signup controller
// exports.signup = async (req, res) => {
// 	// Check if the user already exists
// 	User.findOne({ email: req.body.email }).exec((err, foundUser) => {
// 		if (foundUser) {
// 			return res.status(400).json({
// 				error: 'Email is already taken'
// 			});
// 		}

// 		const { name, email, password } = req.body;

// 		let username = shortId.generate();
// 		let profile = `${process.env.CLIENT_URL}/profile/${username}`;

// 		let newUser = new User({ name, email, password, profile, username });
// 		newUser.save((error, createdUser) => {
// 			if (err) {
// 				return res.status(400).json({
// 					error: err
// 				});
// 			}

// 			// res.json({
// 			// 	user: createdUser
// 			// });

// 			res.json({
// 				message: 'Signup success! Please login.'
// 			});
// 		});
// 	});
// };

exports.signup = (req, res) => {
	const token = req.body.token;

	// check if we have the token
	if (token) {
		// check if it hasn't expire
		jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, (err, decoded) => {
			if (err) {
				return res.status(401).json({
					error: 'Expired link. Signup again'
				});
			}

			const { name, email, password } = jwt.decode(token);

			// generate username and profile
			let username = shortId.generate();
			let profile = `${process.env.CLIENT_URL}/profile/${username}`;

			let newUser = new User({ name, email, password, profile, username });

			newUser.save((error, createdUser) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				}

				// res.json({
				// 	user: createdUser
				// });

				res.json({
					message: 'Signup success! Please Sign in.'
				});
			});
		});
	} else {
		res.json({
			message: 'Something went wrong. Please try again.'
		});
	}
};

// signin controller
exports.signin = (req, res) => {
	const { email, password } = req.body;
	// check if user exist
	User.findOne({ email: email }).exec((err, foundUser) => {
		if (err || !foundUser) {
			return res.status(400).json({
				error: 'User with that email does not exist. Please signup.'
			});
		}

		// authenticate
		if (!foundUser.authenticate(password)) {
			return res.status(400).json({
				error: 'Email and password do not match.'
			});
		}
		// generate a token and send to client
		const token = jwt.sign({ _id: foundUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
		res.cookie('token', token, { expiresIn: '1d' });

		const { _id, username, name, email, role } = foundUser;

		return res.json({
			token,
			user: { _id, username, name, email, role }
		});
	});
};

// signout controller
exports.signout = (req, res) => {
	res.clearCookie('token');
	res.json({
		message: 'Signout success'
	});
};

// middleware to apply to any route we want to protect to only logged-in users
// will compare the incoming token secret with the secret we have in our .env file
// will return true if the token hasn't expired
// it also make the user available in request object. Because the token has the user ID and the expiry date
exports.requireSignin = expressJwt({
	secret: process.env.JWT_SECRET,
	algorithms: [ 'HS256' ],
	userProperty: 'auth' // user available in req.auth as long as there is a valid token
});

// Auth middleware
exports.authMiddleware = (req, res, next) => {
	const authUserId = req.auth._id;
	User.findById({ _id: authUserId }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: 'User not found'
			});
		}

		req.profile = user;
		next();
	});
};

// Admin middleware
exports.adminMiddleware = (req, res, next) => {
	const adminUserId = req.auth._id;
	User.findById({ _id: adminUserId }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: 'User not found'
			});
		}

		if (user.role !== 1) {
			return res.status(400).json({
				error: 'Admin resource. Access denied'
			});
		}

		req.profile = user;
		next();
	});
};

// Check if the user is the owner of the blog before deleting
exports.canUpdateDeleteBlog = (req, res, next) => {
	const slug = req.params.slug.toLowerCase();

	Blog.findOne({ slug }).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: errorHandler(err)
			});
		}

		let authorizedUser = data.postedBy._id.toString() === req.profile._id.toString();

		if (!authorizedUser) {
			return res.status(400).json({
				error: 'You are not authorized to perform this action'
			});
		}

		next();
	});
};

// forgotPassword, resetPassword

exports.forgotPassword = (req, res) => {
	// we need to first grab the email
	const { email } = req.body;

	User.findOne({ email }, (err, user) => {
		if (err || !user) {
			return res.status(401).json({
				error: 'User with that email does not exist'
			});
		}

		const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, { expiresIn: '10m' });
		console.log(token);

		// Once we generate the token we need to send an email with this token to the user
		const emailData = {
			from: process.env.EMAIL_NOREPLY, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
			to: email, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
			subject: `Password reset link`,
			html: `
			<h4>Please use the following link to reset your password:</h4>
			<p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
			<hr />
			<p>This email may contain sensitive information. Please do not reply to this email.</p>
			<p>https://kaymkassai.tech</p>
		`
		};

		console.log(emailData);

		// populate the db > user > resetPasswordLink
		return user.updateOne({ resetPasswordLink: token }, (err, success) => {
			if (err) {
				return res.json({
					error: errorHandler(err)
				});
			} else {
				sendEmailWithNodemailer(req, res, emailData);

				// in the frontend show user this message => message: `Email has been sent to ${email}. Follow the instructions to reset your password. Link expires in 10 minutes`
			}
		});
	});
};

exports.resetPassword = (req, res) => {
	const { resetPasswordLink, newPassword } = req.body;

	if (resetPasswordLink) {
		// check if token has expired or not
		jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, (err, decoded) => {
			if (err) {
				return res.status(401).json({
					error: 'Expired link. Try again'
				});
			}

			User.findOne({ resetPasswordLink }, (err, user) => {
				if (err || !user) {
					return res.status(401).json({
						error: 'Something went wrong. Try again'
					});
				}

				const updatedFields = {
					password: newPassword,
					resetPasswordLink: ''
				};

				user = _.extend(user, updatedFields);

				user.save((err, result) => {
					if (err) {
						return res.status(400).json({
							error: errorHandler(err)
						});
					}

					res.json({
						message: `Great! Now you can login with your new password`
					});
				});
			});
		});
	}
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
	// Send ID token to client side
	const idToken = req.body.tokenId;

	client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID }).then((response) => {
		console.log(response);

		// jti is a unique ID, we're gonna use it to create the user's password so that it will no cause problem with our existing backend structure
		const { email_verified, name, email, jti } = response.payload;

		if (email_verified) {
			User.findOne({ email }).exec((err, user) => {
				if (user) {
					// console.log(user);
					const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
					res.cookie('token', token, { expiresIn: '1d' });

					const { _id, email, name, role, username } = user;

					return res.json({
						token,
						user: { _id, email, name, role, username }
					});
				} else {
					let username = shortId.generate();
					let profile = `${process.env.CLIENT_URL}/profile/${username}`;
					let password = jti;

					user = new User({ name, email, profile, username, password });

					user.save((err, newUser) => {
						if (err) {
							return res.status(400).json({
								error: errorHandler(err)
							});
						}

						const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
						res.cookie('token', token, { expiresIn: '1d' });

						const { _id, email, name, role, username } = newUser;

						return res.json({
							token,
							user: { _id, email, name, role, username }
						});
					});
				}
			});
		} else {
			return res.status(400).json({
				error: 'Authentication with Google failed. Please try again'
			});
		}
	});
};
