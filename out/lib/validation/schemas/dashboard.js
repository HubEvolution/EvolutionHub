"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardActionSchema = void 0;
const zod_1 = require("zod");
exports.dashboardActionSchema = zod_1.z
    .object({
    action: zod_1.z.enum(['create_project', 'create_task', 'invite_member', 'view_docs']),
})
    .strict();
