const nodeMailer = require('nodemailer');

exports.sendEmailWithNodemailer = (req, res, emailData) => {
	const transporter = nodeMailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		secure: false,
		requireTLS: true,
		auth: {
			user: 'kaymkassai269',
			pass: process.env.GMAIL_APP_PASSWORD
		},
		tls: {
			ciphers: 'SSLv3'
		}
	});

	console.log(process.env.GMAIL_APP_PASSWORD);

	return transporter
		.sendMail(emailData)
		.then((info) => {
			console.log(`Message sent: ${info.response}`);
			return res.json({
				success: true
			});
		})
		.catch((err) => console.log(`Problem sending email: ${err}`));
};
