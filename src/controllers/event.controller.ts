import { Request, Response } from "express";
import prisma from "../PrimaClient";
const EVENT_ID = "node-meetup-2025";

export async function seedEvent() {
  try {

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
    } else {
      console.log("data already exist")
    }

    // const data=await prisma.event.deleteMany();
    // console.log(data)

  }
  catch (error) {
    console.error("Error seeding the database", error);
  }
}


export const getEventStatus = async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { eventId: EVENT_ID },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const reservationCount = event.totalSeats - event.availableSeats;

    return res.json({
      eventId: event.eventId,
      name: event.name,
      totalSeats: event.totalSeats,
      availableSeats: event.availableSeats,
      reservationCount,
      version: event.version,
    });
  } catch (error) {
    console.error("Error fetching event status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
