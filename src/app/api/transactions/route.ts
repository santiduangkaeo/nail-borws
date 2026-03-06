import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { TransactionSchema } from "@/lib/validations";
import { getBkkNow } from "@/lib/date-utils";

// GET all transactions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get("date");
        const month = searchParams.get("month"); // format: "2026-02"

        const where: Record<string, unknown> = {};

        if (dateStr) {
            const date = new Date(dateStr);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            where.date = { gte: date, lt: nextDay };
        } else if (month) {
            const [year, m] = month.split("-").map(Number);
            const start = new Date(year, m - 1, 1);
            const end = new Date(year, m, 1);
            where.date = { gte: start, lt: end };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                items: {
                    include: { service: true },
                },
            },
            orderBy: { date: "desc" },
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("GET /api/transactions error:", error);
        return NextResponse.json(
            { error: "ไม่สามารถดึงข้อมูลรายการขายได้" },
            { status: 500 }
        );
    }
}

// POST create a new transaction (POS sale)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = TransactionSchema.safeParse(body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
            return NextResponse.json({ error: message }, { status: 400 });
        }
        const { customerName, employeeName, paymentMethod, description, items, totalAmount, date } = parsed.data;

        const transaction = await prisma.transaction.create({
            data: {
                customerName,
                employeeName,
                totalAmount,
                paymentMethod,
                description: description ?? "",
                date: date ? new Date(date) : getBkkNow(),
                items: {
                    create: items,
                },
            },
            include: {
                items: { include: { service: true } },
            },
        });
        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("POST /api/transactions error:", error);
        return NextResponse.json({ error: "ไม่สามารถบันทึกรายการขายได้" }, { status: 500 });
    }
}
