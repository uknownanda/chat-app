import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://chat-app-one-plum-22.vercel.app",
    "http://localhost:5173",
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Allow non-browser requests (curl, health checks) and known frontend origins.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
}));

app.use(express.json({ limit: "4mb" }));

// This endpoint intentionally does not depend on MongoDB.
app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Chat App API is running",
    });
});

app.get("/api/status", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is live",
        database: "not checked",
    });
});

// Connect to MongoDB only for API routes that need the database.
app.use("/api/auth", async (_req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        res.status(503).json({
            success: false,
            message: "Database connection failed. Check the backend runtime logs.",
        });
    }
});

app.use("/api/messages", async (_req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        res.status(503).json({
            success: false,
            message: "Database connection failed. Check the backend runtime logs.",
        });
    }
});

app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

app.use((error, _req, res, _next) => {
    console.error("Unhandled backend error:", error);
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

// Socket.IO is enabled for local development. For production, deploy this
// persistent server separately and set VITE_SOCKET_URL in the frontend.
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
});

export const userSocketmap = {};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
        userSocketmap[userId] = socket.id;
    }

    io.emit("getOnlineUsers", Object.keys(userSocketmap));

    socket.on("disconnect", () => {
        if (userId && userSocketmap[userId] === socket.id) {
            delete userSocketmap[userId];
        }
        io.emit("getOnlineUsers", Object.keys(userSocketmap));
    });
});

// Vercel uses the Express app as the serverless handler.
// Locally, use the HTTP server so Socket.IO can accept WebSocket connections.
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
