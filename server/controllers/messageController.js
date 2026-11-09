import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getIO, userSocketmap } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const users = await User.find({ _id: { $ne: userId } })
            .select("-password");

        const unseenMessages = {};
        await Promise.all(users.map(async (user) => {
            const count = await Message.countDocuments({
                senderId: user._id,
                receiverId: userId,
                seen: false,
            });
            if (count > 0) unseenMessages[user._id.toString()] = count;
        }));

        return res.status(200).json({
            success: true,
            users,
            unseenMessages,
        });
    } catch (error) {
        console.error("Get Users Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load users",
        });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId },
            ],
        });

        await Message.updateMany(
            { senderId: selectedUserId, receiverId: myId },
            { seen: true }
        );

        return res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error("Get Messages Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load messages",
        });
    }
};

export const markMessageAsSeen = async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, { seen: true });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Mark Seen Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update message status",
        });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        const receiverSocketId = userSocketmap[receiverId.toString()];
        if (receiverSocketId) {
            getIO().to(receiverSocketId).emit("newMessage", newMessage);
        }

        return res.status(201).json({ success: true, newMessage });
    } catch (error) {
        console.error("Send Message Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to send message",
        });
    }
};
