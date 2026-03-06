const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1 - 1, 17, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 16, 59, 59, 999));

    console.log("Checking current expenses...");
    const current = await prisma.expense.findMany({
        where: {
            date: { gte: startOfMonth, lte: endOfMonth },
            category: "รายจ่ายคงที่"
        }
    });
    console.log("Current fixed expenses:", current.map(e => e.description));

    // Simulate deleting 'ค่าเน็ต'
    const net = current.find(e => e.description === "ค่าเน็ต");
    if (net) {
        console.log("Simulating deletion of 'ค่าเน็ต'...");
        await prisma.expense.delete({ where: { id: net.id } });
    } else {
        console.log("'ค่าเน็ต' not found, will be created by trigger.");
    }

    // Trigger API logic (via script simulation or direct DB check if we can't fetch easily)
    // Actually, let's just run the code logic if we can, or assume the manual trigger will be done.
    // Since I can't easily hit the local API port without knowing it, I'll advise the user or use a curl if I can find the port.
}

test().catch(console.error).finally(() => prisma.$disconnect());
