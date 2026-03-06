import { getBkkTodayRange } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range"); // today, weekly, monthly
        const dateParam = searchParams.get("date"); // specific date YYYY-MM-DD

        const where: Record<string, any> = {};

        const { start: todayStart, end: todayEnd, year: y, month: m, day: d } = getBkkTodayRange(dateParam);

        if (range === "monthly") {
            const startOfMonth = new Date(Date.UTC(y, m, 0, 17, 0, 0, 0));
            const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 17, 0, 0, 0));
            where.date = { gte: startOfMonth, lt: endOfMonth };
        } else if (range === "weekly") {
            // Re-calculate start of week based on anchor date in BKK
            const anchorDate = new Date(Date.UTC(y, m, d - 1, 17, 0, 0, 0));
            const dayOfWeek = anchorDate.getDay();
            const diff = anchorDate.getDate() - dayOfWeek;

            const startOfWeek = new Date(Date.UTC(y, m, diff - 1, 17, 0, 0, 0));
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            where.date = { gte: startOfWeek, lt: endOfWeek };
        } else { // today or date
            where.date = { gte: todayStart, lt: todayEnd };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                items: {
                    include: { service: true },
                },
            },
            orderBy: { date: "asc" }, // Order by time ascending for the daily breakdown
        });

        const grouped: Record<string, any> = {};

        for (const t of transactions) {
            const empName = t.employeeName || "ไม่ระบุพนักงาน";
            if (!grouped[empName]) {
                grouped[empName] = {
                    employeeName: empName,
                    transactionCount: 0,
                    totalAmount: 0,
                    paymentMethods: {
                        CASH: { amount: 0, count: 0, label: "Cash" },
                        CREDIT_CARD: { amount: 0, count: 0, label: "Card" },
                        PROMPTPAY: { amount: 0, count: 0, label: "QR" },
                        TRANSFER: { amount: 0, count: 0, label: "Transfer" },
                    },
                    transactions: [],
                };
            }

            grouped[empName].transactionCount += 1;
            grouped[empName].totalAmount += Number(t.totalAmount);

            const method = t.paymentMethod as string;
            if (grouped[empName].paymentMethods[method]) {
                grouped[empName].paymentMethods[method].amount += Number(t.totalAmount);
                grouped[empName].paymentMethods[method].count += 1;
            } else {
                grouped[empName].paymentMethods[method] = { amount: Number(t.totalAmount), count: 1, label: method };
            }

            grouped[empName].transactions.push(t);
        }

        const result = Object.values(grouped).sort((a: any, b: any) =>
            a.employeeName.localeCompare(b.employeeName, 'th')
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("GET /api/staff-logs error:", error);
        return NextResponse.json(
            { error: "ไม่สามารถดึงข้อมูลReportได้" },
            { status: 500 }
        );
    }
}
