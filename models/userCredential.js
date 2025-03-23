const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CredentialSchema = new Schema({
    password: {type: String, minlength: 8},
    dateCreated: {type: Date, default: Date.now},
});

module.exports = mongoose.model('credential', CredentialSchema);