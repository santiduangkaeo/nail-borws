const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    try {
        const appointments = await prisma.appointment.findMany({
            include: {
                service: true
            }
        });
        console.log('---START_DATA---');
        console.log(JSON.stringify(appointments, null, 2));
        console.log('---END_DATA---');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
