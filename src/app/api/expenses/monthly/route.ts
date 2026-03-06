import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");

        // Handle timezone for Thailand (UTC+7)
        // Ensure all calculations are based on Thailand time even if server is in UTC
        const nowUtc = new Date();
        const bkkString = nowUtc.toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
        const bkkNow = new Date(bkkString);

        let targetDate: Date;
        if (dateParam) {
            // If dateParam is provided, we assume it's meant to be that date in BKK context
            targetDate = new Date(dateParam);
        } else {
            targetDate = bkkNow;
        }

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        // Start and end of month in UTC terms that represent 00:00 and 23:59:59 in BKK
        // 00:00 BKK is 17:00 UTC previous day
        const startOfMonth = new Date(Date.UTC(year, month, 1 - 1, 17, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 16, 59, 59, 999));

        // For display/record dates, we'll store them as BKK 12:00 or 23:00 represented in UTC
        const firstDayOfMonthBkk12 = new Date(Date.UTC(year, month, 1, 5, 0, 0, 0)); // 05:00 UTC = 12:00 BKK
        const lastDayOfMonthBkk23 = new Date(Date.UTC(year, month + 1, 0, 16, 0, 0, 0)); // 16:00 UTC = 23:00 BKK

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
            const fixedExpenses = [
                { description: "ค่าเช่าร้าน", amount: 15000, category: "รายจ่ายคงที่" },
                { description: "ค่าเน็ต", amount: 350, category: "รายจ่ายคงที่" },
                { description: "ค่าเครื่องรูดการ์ด", amount: 300, category: "รายจ่ายคงที่" },
                { description: "ขยะ", amount: 50, category: "รายจ่ายคงที่" },
            ];
            await prisma.expense.createMany({
                data: fixedExpenses.map((e) => ({ ...e, date: firstDayOfMonthBkk12 })),
            });
            createdCount += fixedExpenses.length;
        }

        // 2. Handle Furniture Depreciation (8% of CURRENT month revenue)
        // This is calculated at 23:00 on the last day of the month by convention,
        // but can be updated multiple times as revenue grows.
        const currentMonthTransactions = await prisma.transaction.findMany({
            where: {
                date: { gte: startOfMonth, lte: endOfMonth }
            }
        });
        const currentMonthRevenue = currentMonthTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
        const furnitureDepreciationAmount = Math.round(currentMonthRevenue * 0.08);

        const existingDepreciation = await prisma.expense.findFirst({
            where: {
                description: "ค่าเสื่อมเฟอร์นิเจอร์",
                date: { gte: startOfMonth, lte: endOfMonth },
            },
        });

        if (!existingDepreciation && furnitureDepreciationAmount > 0) {
            await prisma.expense.create({
                data: {
                    description: "ค่าเสื่อมเฟอร์นิเจอร์",
                    amount: furnitureDepreciationAmount,
                    category: "รายจ่ายคงที่",
                    date: lastDayOfMonthBkk23,
                },
            });
            createdCount++;
        } else if (existingDepreciation && (Number(existingDepreciation.amount) !== furnitureDepreciationAmount || existingDepreciation.date.getTime() !== lastDayOfMonthBkk23.getTime())) {
            await prisma.expense.update({
                where: { id: existingDepreciation.id },
                data: {
                    amount: furnitureDepreciationAmount,
                    date: lastDayOfMonthBkk23
                },
            });
            updatedCount++;
        }

        // 3. Synchronize Staff Salaries
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
                        date: firstDayOfMonthBkk12,
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
