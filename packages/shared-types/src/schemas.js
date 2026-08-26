"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSchema = exports.reportSchema = void 0;
const zod_1 = require("zod");
exports.reportSchema = zod_1.z.object({
    title: zod_1.z.string().min(5, "Title must be at least 5 characters"),
    description: zod_1.z.string().min(10, "Description must be at least 10 characters"),
    category: zod_1.z.string(),
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
    imageUrl: zod_1.z.string().nullable().optional(),
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});
exports.profileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required"),
    bio: zod_1.z.string().optional(),
    language_pref: zod_1.z.string().optional(),
});
//# sourceMappingURL=schemas.js.map