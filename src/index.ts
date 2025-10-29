import express, { Express, Request, Response } from "express"
import dotenv from "dotenv"
import cors from "cors"
import reservationsRouter from "./routes/reservation.route";
import eventRouter from "./routes/event.route";
import { seedEvent } from "./controllers/event.controller";

const app: Express = express();
dotenv.config()
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json());

async function main() {
    await seedEvent();

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
