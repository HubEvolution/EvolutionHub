"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJwt = createJwt;
exports.verifyJwt = verifyJwt;
const jwt_1 = require("hono/jwt");
async function createJwt(userId, secret) {
    const payload = {
        userId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };
    return await (0, jwt_1.sign)(payload, secret);
}
async function verifyJwt(token, secret) {
    try {
        return await (0, jwt_1.verify)(token, secret);
    }
    catch (_error) {
        return null;
    }
}
