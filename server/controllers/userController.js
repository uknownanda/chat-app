
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Signup a new user
export const signup = async (req, res) => {
    try {
        const { fullName, email, password, bio } = req.body;

        if (!fullName || !email || !password || !bio) {
            return res.status(400).json({
                success: false,
                message: "Missing Details"
            });
        }

        const user = await User.findOne({ email });

        if (user) {
            return res.status(409).json({
                success: false,
                message: "Account already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
            bio
        });

        const token = generateToken(newUser._id);

        const userData = await User.findById(newUser._id)
            .select("-password");

        return res.status(201).json({
            success: true,
            userData,
            token,
            message: "Account created successfully"
        });

    } catch (error) {
        console.error("Signup Error:", error.message);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Login a user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const userData = await User.findOne({ email });

        if (!userData) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            userData.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = generateToken(userData._id);

        const safeUserData = await User.findById(userData._id)
            .select("-password");

        return res.status(200).json({
            success: true,
            userData: safeUserData,
            token,
            message: "Login successful"
        });

    } catch (error) {
        console.error("Login Error:", error.message);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check authentication
export const checkAuth = (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;

        const userId = req.user._id;
        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(
                userId,
                { bio, fullName },
                { new: true, runValidators: true }
            ).select("-password");
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);

            updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    profilePic: upload.secure_url,
                    bio,
                    fullName
                },
                { new: true, runValidators: true }
            ).select("-password");
        }

        return res.status(200).json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.error("Profile Update Error:", error.message);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
