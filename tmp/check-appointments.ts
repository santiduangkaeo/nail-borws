import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    try {
        const appointments = await prisma.appointment.findMany({
            include: {
                service: true
            }
        })
        console.log(JSON.stringify(appointments, null, 2))
    } catch (err) {
        console.error('Error fetching appointments:', err)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
