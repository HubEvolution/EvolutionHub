"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = void 0;
const sonner_1 = require("sonner");
exports.notify = {
    success: (title, opts) => sonner_1.toast.success(title, opts),
    error: (title, opts) => sonner_1.toast.error(title, opts),
    info: (title, opts) => sonner_1.toast.message(title, opts),
    promise: async (p, msgs) => {
        // Trigger Sonner toast lifecycle, but return the original promise's value
        sonner_1.toast.promise(p, msgs);
        return await p;
    },
};
exports.default = exports.notify;
