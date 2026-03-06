const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    try {
        const appointments = await prisma.appointment.findMany({
            include: {
                service: true
            }
        });
        const outputPath = path.join(__dirname, 'appointments-result.json');
        fs.writeFileSync(outputPath, JSON.stringify(appointments, null, 2));
        console.log('Successfully wrote data to ' + outputPath);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
