const { Telegraf } = require("telegraf");

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN; // Add this in Vercel's environment settings
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Add your public webhook URL in Vercel

if (!BOT_TOKEN || !WEBHOOK_URL) {
    throw new Error("BOT_TOKEN and WEBHOOK_URL must be set in environment variables.");
}

// Initialize the bot
const bot = new Telegraf(BOT_TOKEN);

// Data storage (using in-memory storage; migrate to a database for persistence)
const chatRooms = {}; // key: room name, value: { members: Set, joinCode: string }
const userChattingStatus = {}; // key: user ID, value: room name

// Utility function to generate unique codes
const generateCode = () => Math.random().toString(36).substr(2, 8);

// Start command
bot.start((ctx) =>
    ctx.reply(
        "Welcome to the Chat Room Bot!\n\n" +
        "Commands:\n" +
        "/create <room_name> - Create a chat room\n" +
        "/join <join_code> - Join a room using its unique code\n" +
        "/list - List all rooms\n" +
        "/members <room_name> - List members of a room\n" +
        "/exit <room_name> - Leave a room"
    )
);

// Create a chat room
bot.command("create", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const roomName = args.join(" ");

    if (!roomName) {
        return ctx.reply("Please provide a room name. Usage: /create <room_name>");
    }

    if (chatRooms[roomName]) {
        return ctx.reply(`Room '${roomName}' already exists.`);
    }

    const joinCode = generateCode();
    chatRooms[roomName] = { members: new Set([ctx.from.id]), joinCode };
    return ctx.reply(
        `Room '${roomName}' created successfully! Join using the code: ${joinCode}\n\nUse /join ${joinCode} to join it.`
    );
});

// Join a chat room
bot.command("join", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const joinCode = args[0];

    if (!joinCode) {
        return ctx.reply("Please provide a join code. Usage: /join <join_code>");
    }

    const roomName = Object.keys(chatRooms).find(
        (name) => chatRooms[name].joinCode === joinCode
    );

    if (!roomName) {
        return ctx.reply("Invalid join code.");
    }

    chatRooms[roomName].members.add(ctx.from.id);
    return ctx.reply(`You joined the room '${roomName}'.`);
});

// List all chat rooms
bot.command("list", (ctx) => {
    const roomList = Object.keys(chatRooms)
        .map((name) => `${name} (Code: ${chatRooms[name].joinCode})`)
        .join("\n");
    ctx.reply(roomList || "No rooms available.");
});

// List members of a room
bot.command("members", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const roomName = args.join(" ");

    if (!roomName || !chatRooms[roomName]) {
        return ctx.reply("Invalid room name or room does not exist.");
    }

    const members = Array.from(chatRooms[roomName].members).map(
        (id) => `User ID: ${id}`
    );
    ctx.reply(members.join("\n") || "No members in this room.");
});

// Exit a chat room
bot.command("exit", (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const roomName = args.join(" ");

    if (!roomName || !chatRooms[roomName]?.members.has(ctx.from.id)) {
        return ctx.reply(
            "You are not a member of this room or the room does not exist."
        );
    }

    chatRooms[roomName].members.delete(ctx.from.id);
    if (userChattingStatus[ctx.from.id] === roomName) {
        delete userChattingStatus[ctx.from.id];
    }
    return ctx.reply(`You have left the room '${roomName}'.`);
});

// Handle normal messages
bot.on("text", (ctx) => {
    const roomName = userChattingStatus[ctx.from.id];

    if (roomName) {
        const room = chatRooms[roomName];
        if (room) {
            room.members.forEach((memberId) => {
                if (memberId !== ctx.from.id) {
                    ctx.telegram.sendMessage(
                        memberId,
                        `[${roomName}] ${ctx.from.first_name}: ${ctx.message.text}`
                    );
                }
            });
        }
    }
});

// Vercel's HTTP handler
module.exports = async (req, res) => {
    if (req.method === "POST") {
        try {
            await bot.handleUpdate(req.body, res);
        } catch (error) {
            console.error("Error handling update:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.status(200).send("Bot is running.");
    }
};

// Set up the webhook when the script is deployed
(async () => {
    try {
        await bot.telegram.setWebhook(WEBHOOK_URL);
        console.log(`Webhook set to ${WEBHOOK_URL}`);
    } catch (error) {
        console.error("Error setting webhook:", error);
    }
})();
