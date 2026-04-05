import { getBkkTodayRange } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET dashboard summary data
export const dynamic = "force-dynamic"; // Force dynamic execution on Vercel

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get("year");
        const monthParam = searchParams.get("month");

        // Use centralized utility for BKK (UTC+7) calculations
        const { start: todayStart, end: todayEnd, year: currentBkkYear, month: currentBkkMonth } = getBkkTodayRange();

        let targetYear = yearParam ? parseInt(yearParam, 10) : currentBkkYear;
        if (targetYear > 2500) targetYear -= 543; // Convert BE back to AD for DB query

        const targetMonth = monthParam ? parseInt(monthParam, 10) : currentBkkMonth;

        // Is target month currently active? (for today calculations)
        const isCurrentMonth = targetYear === currentBkkYear && targetMonth === currentBkkMonth;

        // Start of target month in BKK (1st day 00:00) is 17:00 UTC of the previous month's last day
        const monthStart = new Date(Date.UTC(targetYear, targetMonth, 0, 17, 0, 0, 0));
        // Start of next month in BKK
        const monthEnd = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 17, 0, 0, 0));

        // Today's revenue
        const todayTransactions = await prisma.transaction.findMany({
            where: { date: { gte: todayStart, lt: todayEnd } },
        });
        const todayRevenue = todayTransactions.reduce(
            (sum, t) => sum + Number(t.totalAmount),
            0
        );
        const todayPaymentBreakdown = todayTransactions.reduce((acc, t) => {
            const method = t.paymentMethod || 'UNKNOWN';
            acc[method] = (acc[method] || 0) + Number(t.totalAmount);
            return acc;
        }, {} as Record<string, number>);

        // Weekly revenue (current week Sunday - Saturday in BKK)
        const anchorDate = new Date(todayStart);
        const dayOfWeek = anchorDate.getDay(); // 0 is Sunday
        const diff = anchorDate.getDate() - dayOfWeek;
        const weekStart = new Date(anchorDate);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekTransactions = await prisma.transaction.findMany({
            where: { date: { gte: weekStart, lt: todayEnd } },
        });
        const weeklyRevenue = weekTransactions.reduce(
            (sum, t) => sum + Number(t.totalAmount),
            0
        );
        const weeklyPaymentBreakdown = weekTransactions.reduce((acc, t) => {
            const method = t.paymentMethod || 'UNKNOWN';
            acc[method] = (acc[method] || 0) + Number(t.totalAmount);
            return acc;
        }, {} as Record<string, number>);

        // Monthly revenue
        const monthTransactions = await prisma.transaction.findMany({
            where: { date: { gte: monthStart, lt: monthEnd } },
        });
        const monthRevenue = monthTransactions.reduce(
            (sum, t) => sum + Number(t.totalAmount),
            0
        );

        const monthlyPaymentBreakdown = monthTransactions.reduce((acc, t) => {
            const method = t.paymentMethod || 'UNKNOWN';
            acc[method] = (acc[method] || 0) + Number(t.totalAmount);
            return acc;
        }, {} as Record<string, number>);

        // Monthly expenses
        const monthExpenses = await prisma.expense.findMany({
            where: { date: { gte: monthStart, lt: monthEnd } },
        });
        const monthExpenseTotal = monthExpenses.reduce(
            (sum, e) => sum + Number(e.amount),
            0
        );

        // Today's appointments
        const todayAppointments = await prisma.appointment.count({
            where: { date: { gte: todayStart, lt: todayEnd } },
        });

        // Today's customers (distinct from transactions)
        const todayCustomers = todayTransactions.length;

        // Upcoming appointments (today + future, not cancelled)
        const upcomingAppointments = await prisma.appointment.findMany({
            where: {
                date: { gte: todayStart },
                status: { not: "CANCELLED" },
            },
            include: { service: true },
            orderBy: [{ date: "asc" }, { time: "asc" }],
            take: 5,
        });

        // Recent transactions
        const recentTransactions = await prisma.transaction.findMany({
            include: {
                items: { include: { service: true } },
            },
            orderBy: { date: "desc" },
            take: 5,
        });

        // Today's employees
        const todayEmployees = await prisma.user.findMany({
            where: {
                role: { in: ["STAFF", "ADMIN"] },
            },
            select: {
                id: true,
                name: true,
                role: true,
            },
        });

        return NextResponse.json({
            todayRevenue,
            todayPaymentBreakdown,
            weeklyRevenue,
            weeklyPaymentBreakdown,
            monthlyRevenue: monthRevenue,
            monthlyPaymentBreakdown,
            monthlyExpenses: monthExpenseTotal,
            todayAppointments,
            todayCustomers,
            upcomingAppointments,
            recentTransactions,
            todayEmployees,
        });
    } catch (error) {
        console.error("GET /api/dashboard error:", error);
        return NextResponse.json(
            { error: "ไม่สามารถดึงข้อมูล Dashboard ได้" },
            { status: 500 }
        );
    }
}
