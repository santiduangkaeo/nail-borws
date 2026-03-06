import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { AppointmentSchema } from "@/lib/validations";
import { getBkkNow } from "@/lib/date-utils";

// GET all appointments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const dateStr = searchParams.get("date");

        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (dateStr) {
            const date = new Date(dateStr);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            where.date = { gte: date, lt: nextDay };
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: { service: true },
            orderBy: [{ date: "asc" }, { time: "asc" }],
        });

        return NextResponse.json(appointments);
    } catch (error) {
        console.error("GET /api/appointments error:", error);
        return NextResponse.json(
            { error: "ไม่สามารถดึงข้อมูลนัดหมายได้" },
            { status: 500 }
        );
    }
}

// POST create a new appointment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = AppointmentSchema.safeParse(body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
            return NextResponse.json({ error: message }, { status: 400 });
        }
        const { customerName, phone, serviceId, date, time, notes, status } = parsed.data;

        const appointment = await prisma.appointment.create({
            data: {
                customerName,
                phone: phone ?? "",
                serviceId,
                date: new Date(date),
                time,
                status,
                notes: notes ?? "",
            },
            include: { service: true },
        });
        return NextResponse.json(appointment, { status: 201 });
    } catch (error) {
        console.error("POST /api/appointments error:", error);
        return NextResponse.json({ error: "ไม่สามารถสร้างนัดหมายได้" }, { status: 500 });
    }
}
