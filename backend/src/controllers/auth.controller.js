import { OAuth2Client } from "google-auth-library";
import { User } from "../models/users.model.js";
import crypto from "crypto";
import httpStatus from "http-status";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ username: email });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = new User({
        name: name,
        username: email,
        password: randomPassword,
      });
      await user.save();
    }

    const appToken = crypto.randomBytes(20).toString("hex");
    user.token = appToken;
    await user.save();

    return res
      .status(httpStatus.OK)
      .json({ token: appToken, name: user.name, username: user.username });
  } catch (error) {
    console.error("Google auth error:", error);
    return res
      .status(200)
      .json({ token: appToken, name: user.name, username: user.username });
  }
};

export { googleLogin };
