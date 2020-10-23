const { sendEmailWithNodemailer } = require('../helpers/email');

exports.contactForm = (req, res) => {
	console.log(req.body);
	const { name, email, message } = req.body;

	const emailData = {
		from: process.env.EMAIL, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
		to: process.env.EMAIL, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
		subject: `${process.env.APP_NAME} | Contact Form`,
		text: `Email received from contact from \n Sender name: ${name} \n Sender email: ${email} \n Sender message: ${message}`,
		html: `
        <h4>Email received from contact form:</h4>
        <p>Sender name: ${name}</p>
        <p>Sender email: ${email}</p>
        <p>Sender message: ${message}</p>
        <hr />
        <p>This email may contain sensitive information</p>
        <p>https://kaymkassai.tech</p>
    `
	};

	sendEmailWithNodemailer(req, res, emailData);
};

exports.contactBlogAuthorForm = (req, res) => {
	console.log(req.body);
	const { name, authorEmail, email, message } = req.body;

	let maillist = [ authorEmail, process.env.EMAIL ];

	const emailData = {
		from: process.env.EMAIL, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
		to: maillist, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
		subject: `${process.env.APP_NAME} | Contact Form`,
		text: `Someone messaged you from \n Sender name: ${name} \n Sender email: ${email} \n Sender message: ${message}`,
		html: `
        <h4>Message received form:</h4>
        <p>name: ${name}</p>
        <p>email: ${email}</p>
        <p>message: ${message}</p>
        <hr />
        <p>This email may contain sensitive information</p>
        <p>https://kaymkassai.tech</p>
    `
	};

	sendEmailWithNodemailer(req, res, emailData);
};
