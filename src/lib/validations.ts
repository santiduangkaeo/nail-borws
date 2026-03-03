import { z } from "zod";

// ─── Service ────────────────────────────────────────────────────────────────
export const ServiceSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อบริการ").max(100),
    category: z.enum(["NAILS", "EYELASH", "PERMANENT_MAKEUP", "COURSE_STUDY"], { message: "หมวดหมู่ไม่ถูกต้อง" }),
    price: z.number({ message: "ราคาต้องเป็นตัวเลข" }).positive("ราคาต้องมากกว่า 0"),
    durationMinutes: z.number({ message: "ระยะเวลาต้องเป็นตัวเลข" }).int().positive("ระยะเวลาต้องมากกว่า 0").default(60),
});
export type ServiceInput = z.infer<typeof ServiceSchema>;

// ─── Appointment ─────────────────────────────────────────────────────────────
export const AppointmentSchema = z.object({
    customerName: z.string().min(1, "กรุณากรอกชื่อลูกค้า").max(100),
    phone: z.string().max(20).optional(),
    serviceId: z.string().min(1, "กรุณาเลือกบริการ"),
    date: z.string().min(1, "กรุณาระบุวันที่"),
    time: z.string().min(1, "กรุณาระบุเวลา"),
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).default("PENDING"),
    notes: z.string().max(500).optional(),
});
export type AppointmentInput = z.infer<typeof AppointmentSchema>;

// ─── Transaction ─────────────────────────────────────────────────────────────
export const TransactionItemSchema = z.object({
    serviceId: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
});
export const TransactionSchema = z.object({
    customerName: z.string().min(1, "กรุณากรอกชื่อลูกค้า").max(100),
    employeeName: z.string().min(1, "กรุณาเลือกพนักงาน").max(100),
    paymentMethod: z.enum(["CASH", "TRANSFER", "PROMPTPAY", "CREDIT_CARD", "GOWABI", "ALIPAY"], {
        message: "วิธีชำระเงินไม่ถูกต้อง",
    }),
    totalAmount: z.number({ message: "ยอดรวมต้องเป็นตัวเลข" }).positive("ยอดรวมต้องมากกว่า 0"),
    description: z.string().max(500).optional(),
    date: z.string().optional(),
    items: z.array(TransactionItemSchema).min(1, "กรุณาเลือกบริการอย่างน้อย 1 รายการ"),
});
export type TransactionInput = z.infer<typeof TransactionSchema>;

// ─── Expense ─────────────────────────────────────────────────────────────────
export const ExpenseSchema = z.object({
    amount: z.number({ message: "จำนวนเงินต้องเป็นตัวเลข" }).positive("จำนวนเงินต้องมากกว่า 0"),
    description: z.string().min(1, "กรุณากรอกรายละเอียด").max(200),
    category: z.string().max(50).optional().default("อื่นๆ"),
    date: z.string().optional(),
});
export type ExpenseInput = z.infer<typeof ExpenseSchema>;
