import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ExpenseSchema } from "@/lib/validations";
import { getBkkNow } from "@/lib/date-utils";

// GET all expenses
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const month = searchParams.get("month"); // format: "2026-02"

        const where: Record<string, unknown> = {};
        if (category) where.category = category;

        if (month) {
            const [year, m] = month.split("-").map(Number);
            const start = new Date(year, m - 1, 1);
            const end = new Date(year, m, 1);
            where.date = { gte: start, lt: end };
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: "desc" },
        });

        return NextResponse.json(expenses);
    } catch (error) {
        console.error("GET /api/expenses error:", error);
        return NextResponse.json(
            { error: "ไม่สามารถดึงข้อมูลรายจ่ายได้" },
            { status: 500 }
        );
    }
}

// POST create a new expense
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = ExpenseSchema.safeParse(body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
            return NextResponse.json({ error: message }, { status: 400 });
        }
        const { amount, description, category, date } = parsed.data;
        const expense = await prisma.expense.create({
            data: {
                amount,
                description,
                category: category ?? "อื่นๆ",
                date: date ? new Date(date) : getBkkNow(),
            },
        });
        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        console.error("POST /api/expenses error:", error);
        return NextResponse.json({ error: "ไม่สามารถบันทึกรายจ่ายได้" }, { status: 500 });
    }
}
