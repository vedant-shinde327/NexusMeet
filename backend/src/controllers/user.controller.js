import { User } from "../models/users.model.js";
import httpStatus from "http-status";
import bcrypt, { compare, hash } from "bcrypt";
import crypto from "crypto";
import Meeting from "../models/meeting.model.js";

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: "all fields are required" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "user not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid Credentials",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.token = token;
    await user.save();

    return res.status(httpStatus.OK).json({
      token: token,
      name: user.name,
      username: user.username,
    });
  } catch (e) {
    return res.status(500).json({ message: `Something went wrong: ${e}` });
  }
};

const register = async (req, res) => {
  const { name, username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ message: "user already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name,
      username: username,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(httpStatus.CREATED).json({ message: "User registered" });
  } catch (e) {
    res.json(`Something went wrong ${e}`);
  }
};

const getUserHistory = async(req, res) => {
  const {token} = req.query;

  try {
    const user = await User.findOne({token: token});
    const meetings = await Meeting.find({user_id: user.username});
    res.json(meetings);
  } catch(e) {
    res.json({message: 'Something went wrong ${e}'});
  }
}

const addToHistory = async (req, res) => {
  const {token, meeting_code} = req.body;
  
  try {
    const user = await User.findOne({token: token})
    const newMeeting = new Meeting({
      user_id: user.username,
      meetingCode: meeting_code
    }) 
    await newMeeting.save();
    res.status(httpStatus.CREATED).json({message: "Added to history"});
  } catch(e) {
    res.json({message: `Something went wrong ${e}`});
  }
}

// GET /api/auth/get_user_profile?token=...
const getUserProfile = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Token is required" });
  }

  try {
    const user = await User.findOne({ token }).select("-password");
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
    }
    return res.status(httpStatus.OK).json({
      name: user.name,
      username: user.username,
    });
  } catch (e) {
    return res.status(500).json({ message: `Error fetching profile: ${e.message}` });
  }
};

// PUT /api/auth/update_user_profile
const updateUserProfile = async (req, res) => {
  const { token, name, username } = req.body;

  if (!token) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Token is required" });
  }

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (username && username.trim() && username.trim() !== user.username) {
      const existingUser = await User.findOne({ username: username.trim() });
      if (existingUser) {
        return res.status(httpStatus.CONFLICT).json({ message: "Username is already taken" });
      }
      user.username = username.trim();
    }

    await user.save();

    return res.status(httpStatus.OK).json({
      message: "Profile updated successfully",
      user: {
        name: user.name,
        username: user.username,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: `Error updating profile: ${e.message}` });
  }
};

// PUT /api/auth/change_password
const changePassword = async (req, res) => {
  const { token, currentPassword, newPassword } = req.body;

  if (!token || !currentPassword || !newPassword) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "All password fields are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "New password must be at least 6 characters" });
  }

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res
      .status(httpStatus.OK)
      .json({ message: "Password updated successfully" });
  } catch (e) {
    return res
      .status(500)
      .json({ message: `Error changing password: ${e.message}` });
  }
};

export { register, login, getUserHistory, addToHistory, getUserProfile, updateUserProfile, changePassword };
