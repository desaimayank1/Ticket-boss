import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EVENT_ID = "node-meetup-2025";

/**
 * Get event details with reservation count
 */
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
