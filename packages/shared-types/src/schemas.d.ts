import { z } from 'zod';
export declare const reportSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    imageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    severity: z.ZodOptional<z.ZodEnum<{
        CRITICAL: "CRITICAL";
        HIGH: "HIGH";
        LOW: "LOW";
        MEDIUM: "MEDIUM";
    }>>;
}, z.core.$strip>;
export declare const profileSchema: z.ZodObject<{
    name: z.ZodString;
    bio: z.ZodOptional<z.ZodString>;
    language_pref: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map