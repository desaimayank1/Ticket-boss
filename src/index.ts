import express, { Express, Request, Response } from "express"
import dotenv from "dotenv"
import cors from "cors"
import reservationsRouter from "./routes/reservation.route";
import eventRouter from "./routes/event.route";
import prisma from "./PrimaClient";

const app: Express = express();
dotenv.config()
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json());

async function seedEvent() {
    const existing = await prisma.event.findUnique({
        where: { eventId: 'node-meetup-2025' },
    });
    if (!existing) {
        await prisma.event.create({
            data: {
                eventId: 'node-meetup-2025',
                name: 'Node.js Meet-up',
                totalSeats: 500,
                availableSeats: 500,
            },
        });
        console.log('Seeded event node-meetup-2025');
    }else{
        console.log("data already exist")
    }
}

async function main() {
    // Seed DB
    await seedEvent();

    // Register routes
    app.use('/reservations', reservationsRouter);
    app.use('/event', eventRouter);

    app.get("/", async (req: Request, res: Response) => {
        res.status(200).json({ success: true, message: "TicketBoss running on localhost:3000..." })
    })

    app.listen(PORT, () => console.log('Server running on http://localhost:3000'));
}

main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
