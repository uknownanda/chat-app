import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const { socket, axios } = useContext(AuthContext);

    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages || {});
            } else {
                toast.error(data.message || "Unable to load users");
            }
        } catch (error) {
            console.error("Get Users Error:", error);
            toast.error(error.response?.data?.message || "Unable to load users");
        }
    };

    const getMessages = async () => {
        if (!selectedUser?._id) return;

        try {
            const { data } = await axios.get(`/api/messages/${selectedUser._id}`);
            if (data.success) {
                setMessages(data.messages);
            } else {
                toast.error(data.message || "Unable to load messages");
            }
        } catch (error) {
            console.error("Get Messages Error:", error);
            toast.error(error.response?.data?.message || "Unable to load messages");
        }
    };

    const sendMessage = async (messageData) => {
        if (!selectedUser?._id) {
            toast.error("Select a conversation first");
            return;
        }

        try {
            const { data } = await axios.post(
                `/api/messages/send/${selectedUser._id}`,
                messageData
            );

            if (data.success) {
                setMessages((previous) => [...previous, data.newMessage]);
            } else {
                toast.error(data.message || "Message could not be sent");
            }
        } catch (error) {
            console.error("Send Message Error:", error);
            toast.error(error.response?.data?.message || "Message could not be sent");
        }
    };

    const subscribeToMessages = () => {
        if (!socket) return;

        socket.off("newMessage");
        socket.on("newMessage", (newMessage) => {
            if (selectedUser && newMessage.senderId === selectedUser._id) {
                newMessage.seen = true;
                setMessages((previous) => [...previous, newMessage]);
                axios.put(`/api/messages/mark/${newMessage._id}`).catch((error) => {
                    console.error("Mark Message Seen Error:", error);
                });
            } else {
                setUnseenMessages((previous) => ({
                    ...previous,
                    [newMessage.senderId]: (previous[newMessage.senderId] || 0) + 1,
                }));
            }
        });
    };

    useEffect(() => {
        subscribeToMessages();
        return () => socket?.off("newMessage");
        // Re-subscribe when socket or selected conversation changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, selectedUser]);

    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        getMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
