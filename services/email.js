const Appointment = require('../models/appointmentModel');
const Doctor = require('../models/doctorModel');
const Clinic = require('../models/clinicModel');

const nodemailer = require('nodemailer');
const { convert } = require('html-to-text');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

module.exports = class Email {
  constructor(
    user,
    url = '',
    appointment = {},
    refundAmount = 0,
    meetingUrl = ''
  ) {
    this.to = user.email;
    this.name = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM;
    this.appointment = appointment;
    this.refundAmount = refundAmount;
    this.meetingUrl = meetingUrl;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'development') {
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
    return null;
  }
  async sendViaBrevo(subject, htmlContent, textContent) {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const emailData = {
      sender: {
        email: this.from,
        name: 'Docto Team',
      },
      to: [
        {
          email: this.to,
          name: this.name,
        },
      ],
      subject,
      htmlContent,
      textContent,
    };

    const response = await apiInstance.sendTransacEmail(emailData);
  }

  async send(template, subject) {
    const text = convert(template);

    if (process.env.NODE_ENV === 'development') {
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html: template,
        text,
      };
      await this.newTransport().sendMail(mailOptions);
    } else {
      await this.sendViaBrevo(subject, template, text);
    }
  }

  async sendWelcome() {
    const mailTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
  <div style="text-align: center; padding: 20px 0;">
    <img src="https://i.imgur.com/JWATyOV.png" alt="Appointment Logo" style="max-width: 100%; width: 100px; height: auto;">
  </div>

  <div style="background: linear-gradient(135deg, #007bff, #0056d2); color: #ffffff; padding: 30px; border-radius: 8px; box-sizing: border-box; text-align: center;">
    <h1 style="font-size: 24px; margin-bottom: 20px;">Welcome to Docto!</h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi <strong>${this.name}</strong>,<br>
      Thank you for signing up! We're thrilled to have you on board. Book and manage your appointments effortlessly.
    </p>
    <a href="${this.url}" style="background-color: #ffffff; color: #007bff; padding: 12px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 16px; display: inline-block; transition: background-color 0.3s, color 0.3s;">
      Book Your Appointment
    </a>
  </div>

  <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Why Choose Us?</h2>
    <ul style="list-style: none; padding: 0; margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
      <li style="margin-bottom: 10px;">✔️ Seamless appointment booking</li>
      <li style="margin-bottom: 10px;">✔️ Reminders for upcoming appointments</li>
      <li style="margin-bottom: 10px;">✔️ Easy rescheduling and management</li>
    </ul>
  </div>

  <div style="text-align: center; padding: 15px 0; font-size: 14px; color: #888; margin-top: 20px;">
    <p style="margin: 0 0 10px;">Follow us:</p>
    <p style="margin: 0;">
      <a href="https://linkedin.com/in/amrith-bharath-v-s-278542258/" style="color: #007bff; text-decoration: none; margin: 0 5px;">LinkedIn</a> | 
      <a href="https://github.com/amrith-git-01" style="color: #007bff; text-decoration: none; margin: 0 5px;">GitHub</a>
    </p>
  </div>
</div>
`;

    const subject = 'Thank you for joining Docto - Your healthcare companion!';
    await this.send(mailTemplate, subject);
  }

  async sendPasswordReset() {
    const mailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
      <div style="text-align: center; padding: 20px 0;">
        <img src="https://i.imgur.com/JWATyOV.png" alt="Docto Logo" style="max-width: 100%; width: 100px; height: auto;">
      </div>
    
      <div style="background: linear-gradient(135deg, #007bff, #0056d2); color: #ffffff; padding: 30px; border-radius: 8px; box-sizing: border-box; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${this.name}</strong>,<br>
          We received a request to reset your password for your Docto account. Click the button below to reset your password. The link is valid for 10 minutes only.
        </p>
        <a href="${this.url}" style="background-color: #ffffff; color: #007bff; padding: 12px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 16px; display: inline-block; transition: background-color 0.3s, color 0.3s;">
          Reset Password
        </a>
      </div>
    
      <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <p style="font-size: 14px; color: #333; line-height: 1.6;">
          If you did not request a password reset, please ignore this email or contact support if you have any concerns.
        </p>
      </div>
    
      <div style="text-align: center; padding: 15px 0; font-size: 14px; color: #888; margin-top: 20px;">
        <p style="margin: 0 0 10px;">Follow us:</p>
        <p style="margin: 0;">
          <a href="https://linkedin.com/in/amrith-bharath-v-s-278542258/" style="color: #007bff; text-decoration: none; margin: 0 5px;">LinkedIn</a> | 
          <a href="https://github.com/amrith-git-01" style="color: #007bff; text-decoration: none; margin: 0 5px;">GitHub</a>
        </p>
      </div>
    </div>
    
    <style>
      /* Responsive Styles */
      @media screen and (max-width: 600px) {
        div[style*="max-width: 600px"] {
          padding: 10px;
        }
        h1 {
          font-size: 22px !important;
        }
        p {
          font-size: 14px !important;
        }
        a {
          font-size: 14px !important;
        }
        img {
          width: 80px !important;
        }
      }
    </style>
    `;

    const subject = 'Reset your password';
    await this.send(mailTemplate, subject);
  }

  async sendConfirmation() {
    const appointmentDate = new Date(this.appointment.appointmentDate);
    const { startTime, endTime } = this.appointment;
    const doctor = await Doctor.findById(this.appointment.doctor);
    const doctorName = doctor.name;
    const clinic = await Clinic.findById(this.appointment.clinic);
    const clinicName = clinic.clinicName;

    const mailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
      <div style="text-align: center; padding: 20px 0;">
        <img src="https://i.imgur.com/JWATyOV.png" alt="Appointment Logo" style="max-width: 100%; width: 100px; height: auto;">
      </div>

      <div style="background: linear-gradient(135deg, #007bff, #0056d2); color: #ffffff; padding: 30px; border-radius: 8px; box-sizing: border-box; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 20px;">Appointment Successfully Booked!</h1>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${this.name}</strong>,<br>
          Your appointment has been successfully booked. Here are the details:
        </p>
      </div>

      <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Appointment Details</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          <strong>Doctor's Name:</strong> ${doctorName}<br>
          <strong>Clinic Name:</strong> ${clinicName}<br>
          <strong>Appointment Date:</strong> ${appointmentDate}<br>
          <strong>Time:</strong> ${startTime} - ${endTime}<br>
        </p>
      </div>

      <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">What to Expect</h2>
        <ul style="list-style: none; padding: 0; margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
          <li style="margin-bottom: 10px;">✔️ Be on time for your appointment</li>
          <li style="margin-bottom: 10px;">✔️ Bring your ID and any necessary documents</li>
          <li style="margin-bottom: 10px;">✔️ Follow any specific instructions from the doctor or clinic</li>
        </ul>
      </div>

      <div style="text-align: center; padding: 15px 0; font-size: 14px; color: #888; margin-top: 20px;">
        <p style="margin: 0 0 10px;">Follow us:</p>
        <p style="margin: 0;">
          <a href="https://linkedin.com/in/amrith-bharath-v-s-278542258/" style="color: #007bff; text-decoration: none; margin: 0 5px;">LinkedIn</a> | 
          <a href="https://github.com/amrith-git-01" style="color: #007bff; text-decoration: none; margin: 0 5px;">GitHub</a>
        </p>
      </div>
    </div>`;

    const subject = 'Appointment Successfully Booked!';
    await this.send(mailTemplate, subject);
  }

  async sendCancellation() {
    try {
      const doctor = await Doctor.findById(this.appointment.doctor);
      const clinic = await Clinic.findById(this.appointment.clinic);
      const doctorName = doctor.name;
      const clinicName = clinic.name;

      const appointmentDate = new Date(this.appointment.appointmentDate);

      const { startTime, endTime } = this.appointment;
      const mailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
    <div style="text-align: center; padding: 20px 0;">
    <img src="https://i.imgur.com/JWATyOV.png" alt="Appointment Logo" style="max-width: 100%; width: 100px; height: auto;">
    </div>
    
    <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: #ffffff; padding: 30px; border-radius: 8px; box-sizing: border-box; text-align: center;">
    <h1 style="font-size: 24px; margin-bottom: 20px;">Your Appointment has been Cancelled</h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    Hi <strong>${this.name}</strong>,<br>
          We regret to inform you that your appointment has been cancelled. Below are the details:
        </p>
      </div>

      <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Cancelled Appointment Details</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #555;">
      <strong>Doctor's Name:</strong> ${doctorName}<br>
          <strong>Clinic Name:</strong> ${clinicName}<br>
          <strong>Appointment Date:</strong> ${appointmentDate}<br>
          <strong>Time:</strong> ${startTime} - ${endTime}<br>
          </p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Refund Details</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          <strong>Refund Amount:</strong> $${this.refundAmount}<br>
          </p>
      </div>
      
      <div style="text-align: center; padding: 15px 0; font-size: 14px; color: #888; margin-top: 20px;">
      <p style="margin: 0 0 10px;">Follow us:</p>
        <p style="margin: 0;">
        <a href="https://linkedin.com/in/amrith-bharath-v-s-278542258/" style="color: #007bff; text-decoration: none; margin: 0 5px;">LinkedIn</a> | 
        <a href="https://github.com/amrith-git-01" style="color: #007bff; text-decoration: none; margin: 0 5px;">GitHub</a>
        </p>
        </div>
        </div>`;

      const subject = 'Appointment Successfully Cancelled!';
      await this.send(mailTemplate, subject);
    } catch (error) {
      console.error(error.message);
    }
  }
  async sendRemainder() {
    const { startTime, endTime } = this.appointment;
    const appointmentDate = new Date(this.appointment.appointmentDate);

    const doctor = await Doctor.findById(this.appointment.doctor);
    const clinic = await Clinic.findById(this.appointment.clinic);
    const doctorName = doctor.name;
    const { clinicName, clinicAddress } = clinic;

    const mailTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
      <div style="text-align: center; padding: 20px 0;">
        <img src="https://i.imgur.com/JWATyOV.png" alt="Reminder Logo" style="max-width: 100%; width: 100px; height: auto;">
      </div>

      <div style="background: linear-gradient(135deg, #ffc107, #ff9800); color: #ffffff; padding: 30px; border-radius: 8px; box-sizing: border-box; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 20px;">Friendly Reminder: Upcoming Appointment</h1>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${this.name}</strong>,<br>
          This is a gentle reminder about your upcoming appointment. Below are the details for your convenience:
        </p>
      </div>

      <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Appointment Details</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          <strong>Doctor's Name:</strong> ${doctorName}<br>
          <strong>Clinic Name:</strong> ${clinicName}<br>
          <strong>Clinic Address:</strong> ${clinicAddress}<br>
          <strong>Appointment Date:</strong> ${appointmentDate}<br>
          <strong>Time:</strong> ${startTime} - ${endTime}<br>
        </p>
      </div>

      <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Before You Arrive</h2>
        <ul style="list-style: none; padding: 0; margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
          <li style="margin-bottom: 10px;">✔️ Arrive at least 10 minutes early to complete any paperwork.</li>
          <li style="margin-bottom: 10px;">✔️ Bring your ID and any medical documents, if required.</li>
          <li style="margin-bottom: 10px;">✔️ Contact us if you have any special requests or need directions to the clinic.</li>
        </ul>
      </div>

      <div style="text-align: center; padding: 15px 0; font-size: 14px; color: #888; margin-top: 20px;">
        <p style="margin: 0 0 10px;">Follow us:</p>
        <p style="margin: 0;">
          <a href="https://linkedin.com/in/amrith-bharath-v-s-278542258/" style="color: #007bff; text-decoration: none; margin: 0 5px;">LinkedIn</a> | 
          <a href="https://github.com/amrith-git-01" style="color: #007bff; text-decoration: none; margin: 0 5px;">GitHub</a>
        </p>
      </div>
    </div>`;

    const subject = 'Friendly Reminder: Upcoming Appointment';
    await this.send(mailTemplate, subject);
  }

  async sendMeetingUrl(appointmentId, meetingUrl) {
    const appointment = await Appointment.findById(appointmentId).populate([
      { path: 'doctor' },
      { path: 'clinic' },
    ]);
    const doctorName = appointment.doctor.name;
    const clinicName = appointment.clinic.clinicName;
    const { startTime, endTime, appointmentDate } = appointment;

    const meetingTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
    <div style="text-align: center; padding: 20px 0;">
    <img src="https://i.imgur.com/JWATyOV.png" alt="Online Meeting Logo" style="max-width: 100%; width: 100px; height: auto;">
    </div>

    <div style="background: linear-gradient(135deg, #007bff, #4caf50); color: #ffffff; padding: 30px; border-radius: 8px; box-sizing: border-box; text-align: center;">
    <h1 style="font-size: 24px; margin-bottom: 20px;">Your Meeting is Scheduled!</h1>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${this.name}</strong>,<br>
          We’re excited to inform you that your online consultation is scheduled. Below are the details:
          </p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Meeting Details</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
          <strong>Doctor's Name:</strong> ${doctorName}<br>
          <strong>Clinic Name:</strong> ${clinicName}<br>
          <strong>Appointment Date:</strong> ${appointmentDate}<br>
          <strong>Time:</strong> ${startTime} - ${endTime}<br>
          <strong>Meeting Link:</strong> <a href="${meetingUrl}" style="color: #007bff; text-decoration: none;">Join Meeting</a>
        </p>
        </div>

        <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Instructions for Online Meeting</h2>
        <ul style="list-style: none; padding: 0; margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
        <li style="margin-bottom: 10px;">✔️ Please join the meeting 5 minutes before the scheduled time to avoid any delays.</li>
        <li style="margin-bottom: 10px;">✔️ Make sure your internet connection is stable.</li>
          <li style="margin-bottom: 10px;">✔️ Ensure your microphone and webcam are working properly.</li>
          <li style="margin-bottom: 10px;">✔️ Have any required documents or reports ready for discussion.</li>
          <li style="margin-bottom: 10px;">✔️ Use the provided meeting link above to join the session. Ensure you are in a quiet environment for the best experience.</li>
          </ul>
      </div>

      <div style="text-align: center; padding: 15px 0; font-size: 14px; color: #888; margin-top: 20px;">
      <p style="margin: 0 0 10px;">Follow us:</p>
        <p style="margin: 0;">
          <a href="https://linkedin.com/in/amrith-bharath-v-s-278542258/" style="color: #007bff; text-decoration: none; margin: 0 5px;">LinkedIn</a> |
          <a href="https://github.com/amrith-git-01" style="color: #007bff; text-decoration: none; margin: 0 5px;">GitHub</a>
        </p>
      </div>
    </div>`;

    const subject = 'Online Meeting Link';
    await this.send(meetingTemplate, subject);
  }

  async sendPatientInvite(referralCode) {
    const mailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
    <div style="text-align: center; padding: 20px 0;">
      <img src="https://i.imgur.com/JWATyOV.png" alt="Referral Logo" style="max-width: 100%; width: 100px; height: auto;">
    </div>

    <div style="background: linear-gradient(135deg, #007bff, #4caf50); color: #ffffff; padding: 30px; border-radius: 8px; box-sizing: border-box; text-align: center;">
      <h1 style="font-size: 24px; margin-bottom: 20px;">Invite & Earn Rewards!</h1>
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Hi <strong>${this.name}</strong>,<br>
        We’re excited to introduce our referral program! Share the benefits of Docto with your friends and earn exclusive rewards for every successful referral.
      </p>
    </div>

    <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">How It Works</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #555;">
        <strong>Step 1:</strong> Share your unique referral code with friends.<br>
        <strong>Step 2:</strong> Your friends sign up using your referral code.<br>
        <strong>Step 3:</strong> Both you and your friend earn rewards when they make their first purchase or use our service.<br>
      </p>
    </div>

    <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Your Referral Details</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #555;">
        <strong>Your Referral Code:</strong> ${referralCode}<br>
      <br>
      </p>
    </div>

    <div style="background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="font-size: 20px; color: #333; margin-bottom: 15px; text-align: center;">Why Refer Us?</h2>
      <ul style="list-style: none; padding: 0; margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
        <li style="margin-bottom: 10px;">✔️ Help your friends access easy appointments.</li>
        <li style="margin-bottom: 10px;">✔️ Earn exciting rewards for every successful referral.</li>
        <li style="margin-bottom: 10px;">✔️ Share a service that you already love and trust.</li>
      </ul>
    </div>

    <div style="text-align: center; padding: 15px 0; font-size: 14px; color: #888; margin-top: 20px;">
      <p style="margin: 0 0 10px;">Follow us:</p>
      <p style="margin: 0;">
        <a href="https://linkedin.com/in/amrith-bharath-v-s-278542258/" style="color: #007bff; text-decoration: none; margin: 0 5px;">LinkedIn</a> |
        <a href="https://github.com/amrith-git-01" style="color: #007bff; text-decoration: none; margin: 0 5px;">GitHub</a>
      </p>
    </div>
  </div>`;

    const subject = 'Referral From Docto';
    await this.send(mailTemplate, subject);
  }
};
