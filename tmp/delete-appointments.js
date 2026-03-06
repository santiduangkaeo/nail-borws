const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    const idsToDelete = [
        'cmmdxlzfz001h72hza8a5nwye',
        'cmmdxlzfz001g72hzdxadpmlf'
    ];

    for (const id of idsToDelete) {
        try {
            const deleted = await prisma.appointment.delete({
                where: { id }
            });
            console.log(`Successfully deleted appointment ID: ${id} (${deleted.customerName})`);
        } catch (err) {
            if (err.code === 'P2025') {
                console.log(`Appointment ID: ${id} not found, skipping.`);
            } else {
                console.error(`Error deleting ID ${id}:`, err);
            }
        }
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
