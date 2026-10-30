import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing"
    });
  }

  const [tokenType, token] = authHeader.split(" ");

  if (tokenType !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format"
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    if (!decoded.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
    }

    const result = await query(
      `
        SELECT
          user_id,
          role,
          account_status
        FROM users
        WHERE user_id = $1
        LIMIT 1
      `,
      [decoded.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists"
      });
    }

    const user = result.rows[0];

    if (user.account_status !== "active") {
      const messages = {
        suspended: "This account is temporarily suspended",
        banned: "This account has been banned",
        disabled: "This account has been disabled",
        deleted: "This account is no longer active"
      };

      return res.status(403).json({
        success: false,
        message:
          messages[user.account_status] ||
          "This account is not currently active"
      });
    }

    req.user = {
      user_id: user.user_id,
      role: user.role
    };

    next();

  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Your session has expired. Please sign in again."
            : "Invalid access token"
      });
    }

    console.error("Chatbot authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to authenticate user"
    });
  }
}