"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePasswords = comparePasswords;
const bcryptjs_1 = require("bcryptjs");
const SALT_ROUNDS = 10;
async function hashPassword(password) {
    return await (0, bcryptjs_1.hash)(password, SALT_ROUNDS);
}
async function comparePasswords(password, hash) {
    return await (0, bcryptjs_1.compare)(password, hash);
}
