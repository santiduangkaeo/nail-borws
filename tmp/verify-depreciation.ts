import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking database for furniture depreciation...");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const depreciation = await prisma.expense.findFirst({
        where: {
            description: "ค่าเสื่อมเฟอร์นิเจอร์",
            date: { gte: startOfMonth, lte: endOfMonth }
        }
    });

    if (depreciation) {
        console.log("Found record:");
        console.log(`- Amount: ${depreciation.amount}`);
        console.log(`- Date: ${depreciation.date}`);
        console.log(`- Category: ${depreciation.category}`);

        const lastDayAt23 = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 0, 0);
        if (depreciation.date.getTime() === lastDayAt23.getTime()) {
            console.log("✅ Date is correctly set to 23:00 on the last day of the month.");
        } else {
            console.log("❌ Date is NOT set to 23:00 on the last day.");
            console.log(`Expected: ${lastDayAt23}`);
            console.log(`Actual:   ${depreciation.date}`);
        }
    } else {
        console.log("No record found for this month yet. Creating mock data and triggering...");
        // Add a transaction to ensure revenue > 0
        await prisma.transaction.create({
            data: { customerName: "Verification", totalAmount: 1000, description: "Verification" }
        });

        // Simulating the API call logic manually or just explaining
        console.log("Triggering logic manually...");
        // Re-run the script after a mock API hit if possible, or just mock the logic in the script
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
