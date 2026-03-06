import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting depreciation test...");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Add some mock transactions if none exist for this month
    const count = await prisma.transaction.count({
        where: { date: { gte: startOfMonth, lte: endOfMonth } }
    });

    if (count === 0) {
        console.log("No transactions found for current month. Adding mock transactions...");
        await prisma.transaction.createMany({
            data: [
                { customerName: "Test 1", totalAmount: 1000, date: now, description: "Test Transaction" },
                { customerName: "Test 2", totalAmount: 2000, date: now, description: "Test Transaction" },
            ]
        });
    }

    // 2. Mock calling the API (simulated)
    // In a real environment, we'd use fetch, but here we can just check the database after triggering it.
    console.log("Please visit /api/expenses/monthly in your browser or run a curl command.");
    console.log("Expected Revenue: " + (count === 0 ? 3000 : "Existing amount"));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
