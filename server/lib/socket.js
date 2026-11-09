import { Server } from "socket.io";

let io;
export const userSocketmap = {};

export const initializeSocket = (httpServer, allowedOrigins) => {
    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId?.toString();

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

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.IO has not been initialized");
    return io;
};
