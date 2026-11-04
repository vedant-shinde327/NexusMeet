import { OAuth2Client } from "google-auth-library";
import { User } from "../models/users.model.js";
import crypto from "crypto";
import httpStatus from "http-status";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  const { token } = req.body; // Token sent from frontend

  try {
    // 1. Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // 2. Check if user already exists in your database
    let user = await User.findOne({ username: email });

    if (!user) {
      // If user doesn't exist, automatically register them
      // Generate a dummy random password since they login via Google
      const randomPassword = crypto.randomBytes(16).toString("hex");

      user = new User({
        name: name,
        username: email, // using email as username
        password: randomPassword, // ideally mark account as social-login
      });
      await user.save();
    }

    // 3. Generate your app's session/auth token (matching your existing auth flow)
    const appToken = crypto.randomBytes(20).toString("hex");
    user.token = appToken;
    await user.save();

    // 4. Send back the token to the frontend
    return res.status(httpStatus.OK).json({ token: appToken });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({ message: "Google authentication failed" });
  }
};

export { googleLogin };
