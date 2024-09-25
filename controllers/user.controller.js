const { UserModel, UserDetailModel, OTPModel } = require("../models");
const logger = require("../config/logger");
const transporter = require("../config/nodemailerConfig");
const crypto = require("crypto");
const { handleRequest, createError } = require("../services/responseHandler");

const generateOTP = () => crypto.randomBytes(3).toString("hex");
const getEmailTemplate = (otp, role) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email OTP Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        } 
        .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #2c3e50;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #3498db;
            letter-spacing: 5px;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #7f8c8d;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Email OTP Confirmation</h1>
        <p>Dear ${role === "seller" ? "Seller" : "User"},</p>
        <p>Thank you for registering with us. To complete your registration, please use the following One-Time Password (OTP):</p>
        <div class="otp-code">${otp}</div>
        <p>This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
        <p>Best regards,<br>${role === "seller" ? "Saleso" : "Your Company Name"}</p>
    </div>
    <div class="footer">
        This is an automated message. Please do not reply to this email.
    </div>
</body>
</html>
`;

const UserController = {
  getUser: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const user_id = req.user._id.toString();
      const role = req.user.role;
      return await UserModel.getUserById(user_id, role);
    });
  },

  getDetail: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const user_id = req.user._id.toString();
      const role = req.user.role;
      return await UserDetailModel.getDetail(user_id, role);
    });
  },

  getAddress: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const user_id = req.user._id.toString();
      const role = req.user.role;
      return await UserDetailModel.getAddress(user_id, role);
    });
  },

  updateUsername: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { username, role } = req.body;
      const user_id = req.user._id.toString();
      await UserModel.updateUsername(user_id, username, role);
      return { message: "Username updated successfully" };
    });
  },

  updateDetail: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const user_id = req.user._id.toString();
      const role = req.user.role;
      await UserDetailModel.updateDetail(user_id, req.body, role);
      return { message: "Updated customer information successfully" };
    });
  },

  newEmail: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const role = req.user.role;
      const { newEmail } = req.body;

      const otp = generateOTP();
      await OTPModel.storeOTP(newEmail, otp, role);

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: newEmail,
        subject: "New Email OTP",
        html: `<p>Your OTP code is: ${otp}</p>`,
      });

      logger.info(`OTP sent to email: ${newEmail}`);
      return { message: "OTP sent to email" };
    });
  },

  updateEmail: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { newEmail, otp } = req.body;
      const user_id = req.user._id;
      const role = req.user.role;

      const validOTP = await OTPModel.verifyOTP(newEmail, otp, role);
      if (!validOTP) {
        throw createError("Invalid OTP", 400, "INVALID_OTP");
      }

      await UserModel.updateUserField(user_id, { ["email"]: newEmail }, role);
      // create notification
      const notificationData = {
        title: "New Email OTP",
        content: `Your OTP code is: ${otp}`,
        notification_type: "account_notification",
        target_type: "individual",
        target_ids: [req.user._id.toString()],
        can_delete: false,
        can_mark_as_read: false,
        is_read: false,
        created_at: new Date(),
      };
      await sendCreateNewNotification(notificationData);
      return { message: "Update Email Successful!" };
    });
  },

  updatePassword: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const role = req.user.role;
      const { newPassword } = req.body;
      const user_id = req.user._id.toString();
      await UserModel.updatePassword(user_id, newPassword, role);
      // create notification
      const notificationData = {
        title: "Password Updated",
        content: `Your password has been updated successfully!`,
        notification_type: "account_notification",
        target_type: "individual",
        target_ids: [req.user._id.toString()],
        can_delete: false,
        can_mark_as_read: false,
        is_read: false,
        created_at: new Date(),
      };
      await sendCreateNewNotification(notificationData);
      return { message: "Password updated successfully!" };
    });
  },

  forgetPassword: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { email } = req.body;
      const role = req.user.role;
      const otp = generateOTP();
      await OTPModel.storeOTP(email, otp, role);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset OTP",
        html: getEmailTemplate(otp, role),
      });

      logger.info(`OTP sent to email: ${email}`);
      return { message: "OTP sent to email" };
    });
  },

  updateForgetPassword: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { email, otp, newPassword } = req.body;
      const role = req.user.role;

      const validOTP = await OTPModel.verifyOTP(email, otp, role);
      if (!validOTP) {
        throw createError("Invalid OTP", 400, "INVALID_OTP");
      }

      await UserModel.updateForgetPassword(email, newPassword, role);

      // create notification
      const notificationData = {
        title: "Password Reset",
        content: `Your password has been reset successfully!`,
        notification_type: "account_notification",
        target_type: "individual",
        target_ids: [req.user._id.toString()],
        can_delete: false,
        can_mark_as_read: false,
        is_read: false,
        created_at: new Date(),
      };
      await sendCreateNewNotification(notificationData);

      return { message: "Password reset successfully" };
    });
  },
};

module.exports = UserController;
