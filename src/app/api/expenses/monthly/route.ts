import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");

        // Handle timezone for Thailand (UTC+7)
        // If no date provided, use current time in Thailand
        let currentDate: Date;
        if (dateParam) {
            currentDate = new Date(dateParam);
        } else {
            const now = new Date();
            // Offset to Thai time if we want to be precise, but usually currentDate is fine for server-side month detection
            currentDate = now;
        }

        console.log("Checking monthly expenses for date:", currentDate.toISOString());

        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 12, 0, 0);

        let createdCount = 0;
        let updatedCount = 0;

        // 1. Check and create Fixed Expenses (Rent, Net, etc.)
        const existingRent = await prisma.expense.findFirst({
            where: {
                description: "ค่าเช่าร้าน",
                date: { gte: startOfMonth, lte: endOfMonth },
            },
        });

        if (!existingRent) {
            // Calculate previous month's revenue for Furniture Depreciation (8%)
            const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const startOfPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1);
            const endOfPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

            const prevMonthTransactions = await prisma.transaction.findMany({
                where: {
                    date: { gte: startOfPrevMonth, lte: endOfPrevMonth }
                }
            });
            const prevMonthRevenue = prevMonthTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
            const furnitureDepreciationAmount = Math.round(prevMonthRevenue * 0.08);

            const fixedExpenses = [
                { description: "ค่าเช่าร้าน", amount: 15000, category: "รายจ่ายคงที่" },
                { description: "ค่าเน็ต", amount: 350, category: "รายจ่ายคงที่" },
                { description: "ค่าเครื่องรูดการ์ด", amount: 300, category: "รายจ่ายคงที่" },
                { description: "ขยะ", amount: 50, category: "รายจ่ายคงที่" },
                { description: "ค่าเสื่อมเฟอร์นิเจอร์", amount: furnitureDepreciationAmount, category: "รายจ่ายคงที่" },
            ];
            await prisma.expense.createMany({
                data: fixedExpenses.map((e) => ({ ...e, date: firstDayOfMonth })),
            });
            createdCount += fixedExpenses.length;
        }

        // 2. Synchronize Staff Salaries
        const staffList = await prisma.user.findMany({
            where: { salary: { gt: 0 } },
        });

        for (const staff of staffList) {
            const description = `เงินเดือนพนักงาน: ${staff.name}`;
            const amount = Number(staff.salary);

            const existingSalary = await prisma.expense.findFirst({
                where: {
                    description: description,
                    category: "เงินเดือน",
                    date: { gte: startOfMonth, lte: endOfMonth },
                },
            });

            if (!existingSalary) {
                await prisma.expense.create({
                    data: {
                        description: description,
                        amount: amount,
                        category: "เงินเดือน",
                        date: firstDayOfMonth,
                    },
                });
                createdCount++;
            } else if (Number(existingSalary.amount) !== amount) {
                // Update existing salary if amount has changed
                await prisma.expense.update({
                    where: { id: existingSalary.id },
                    data: { amount: amount },
                });
                updatedCount++;
            }
        }

        if (createdCount === 0 && updatedCount === 0) {
            return NextResponse.json({ message: "Monthly expenses already up to date." }, { status: 200 });
        }

        return NextResponse.json({
            message: "Monthly expenses processed successfully.",
            created: createdCount,
            updated: updatedCount
        }, { status: 200 });
    } catch (error) {
        console.error("Error generating monthly expenses:", error);
        return NextResponse.json({ error: "Failed to generate monthly expenses", details: String(error) }, { status: 500 });
    }
}
