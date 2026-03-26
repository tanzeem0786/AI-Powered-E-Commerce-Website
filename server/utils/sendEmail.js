import nodemailer from 'nodemailer';

export const sendEmail = async({email, subject, message}) => {
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      service: process.env.SMTP_SERVICE,
      port: process.env.SMTP_PORT,
      secure: false, // Use true for port 465, false for port 587
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject: subject,
        html: message
    };
    
    await transporter.sendMail(mailOptions);


}