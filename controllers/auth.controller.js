const { UserModel, UserDetailModel } = require("../models");
const transporter = require("../config/nodemailerConfig");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OTPProducer } = require("../producers/otp-producer");
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

const AuthController = {
  verifyNewEmail: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { email, role } = req.body;
      const existingUser = await UserModel.getUserByEmail(email, role);
      if (existingUser) {
        throw createError(
          `This <${email}> is linked to another account`,
          400,
          "EMAIL_ALREADY_EXISTS"
        );
      }
      const otp = generateOTP();
      await OTPProducer.storeOTP(email, otp, role);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Saleso - Email OTP Confirmation ${role === "seller" ? "Seller" : ""}`,
        html: getEmailTemplate(otp, role),
      });
      return { message: "Please check the OTP sent to gmail" };
    });
  },

  registerUserWithOTP: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { email, otp, username, password, role } = req.body;
      const validOTP = await OTPProducer.verifyOTP(email, otp, role);
      if (!validOTP) {
        throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
      }

      if (await UserModel.getUserByUsername(username, role)) {
        throw createError(
          "This username is already in use",
          400,
          "USERNAME_TAKEN"
        );
      }

      const hashedPassword = await bcryptjs.hash(password, 10);
      const userData = {
        username,
        email,
        role,
        password: hashedPassword,
        register_at: new Date(),
      };

      const user = await UserModel.registerUser(userData, role);
      if (role === "customer") {
        const customer = await UserModel.getUserByEmail(email, role);
        const detailData = {
          customer_id: customer._id.toString(),
          avatar_uri: "",
          name: "",
          address: [],
          age: null,
        };
        await UserDetailModel.newDetail(detailData, role);
      } else {
        const seller = await UserModel.getUserByEmail(email, role);
        const detailData = {
          seller_id: seller._id.toString(),
          avatar_uri: "",
          address: [],
          categories: [],
        };
        await UserDetailModel.newDetail(detailData, role);
      }
      return { message: "User registered successfully", user_id: user };
    });
  },

  loginUser: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { email, password, role } = req.body;
      const existingUser = await UserModel.getUserByEmail(email, role);
      if (!existingUser) {
        throw createError(
          "This email has not been registered.",
          401,
          "EMAIL_NOT_REGISTERED"
        );
      }
      const isPasswordValid = await bcryptjs.compare(
        password,
        existingUser.password
      );
      if (!isPasswordValid) {
        throw createError(
          "This password is not valid",
          401,
          "INVALID_PASSWORD"
        );
      }

      const accessToken = jwt.sign(
        { user_id: existingUser._id, role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1d" }
      );
      const refreshToken = jwt.sign(
        { user_id: existingUser._id, role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "7d" }
      );
      await UserModel.updateRefreshToken(existingUser._id, refreshToken, role);

      const currentUser = {
        user_id: existingUser._id,
        username: existingUser.username,
        role: role,
      };

      return { accessToken, refreshToken, currentUser };
    });
  },

  // use when change password, change email, do something need verify account...
  verifyAccount: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { email, password } = req.body;
      const role = req.user.role;
      const existingUser = await UserModel.getUserByEmail(email, role);
      if (!existingUser) {
        throw createError(
          "This email has not been registered.",
          401,
          "EMAIL_NOT_REGISTERED"
        );
      }
      const isPasswordValid = await bcryptjs.compare(
        password,
        existingUser.password
      );
      if (!isPasswordValid) {
        throw createError(
          "This password is not valid",
          401,
          "INVALID_PASSWORD"
        );
      }
      return { message: "Verify account successfully" };
    });
  },

  refreshAccessToken: async (req, res) => {
    handleRequest(req, res, async (req) => {
      const { accessToken, refreshToken } = req.token;
      return { newAccessToken: accessToken, newRefreshToken: refreshToken };
    });
  },
};

module.exports = AuthController;
