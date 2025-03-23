const mongoose = require("mongoose");
const credential = require("./userCredential");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    messageTime: Date,
    messageContent: String,
    incoming: Boolean,
});

const ConversationSchema = new Schema({
    otherID: {type: mongoose.Schema.Types.ObjectId, ref: "credential", required: true},
    chatHistory: [MessageSchema],
    latestDate: Date,
});

const UserSchema = new Schema({
    userID: {type: mongoose.Schema.Types.ObjectId, ref: "credential", required: true, unique: true},
    username: {type: String, required: true, maxlength: 30},
    email: {type: String, required: true, match: /^\S+@\S+\.\S+$/, required: true, unique: true},
    contact: [{type: mongoose.Schema.Types.ObjectId, ref: "credential"}],
    conversation: [ConversationSchema],
});

UserSchema.index({
    userID: 1,
    email: 1
});

UserSchema.virtual("url").get(() => {
    return `/user/${this._id}`;
});

module.exports = mongoose.model("users", UserSchema);