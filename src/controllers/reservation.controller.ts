import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const MAX_RETRIES = 5;
const EVENT_ID = "node-meetup-2025";

/**
 * Create a reservation with optimistic concurrency control
 */
export const createReservation = async (req: Request, res: Response) => {
  const { partnerId, seats } = req.body;

  if (!partnerId || typeof partnerId !== "string")
    return res.status(400).json({ error: "partnerId is required" });

  if (!Number.isInteger(seats) || seats <= 0 || seats > 10)
    return res.status(400).json({ error: "seats must be 1–10" });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const event = await prisma.event.findUnique({
      where: { eventId: EVENT_ID },
      select: { availableSeats: true, version: true },
    });
    if (!event)
      return res.status(500).json({ error: "Event not found" });

    if (event.availableSeats < seats)
      return res.status(409).json({ error: "Not enough seats left" });
    console.log("he")
    try {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.event.updateMany({
          where: { eventId: EVENT_ID, version: event.version },
          data: {
            availableSeats: { decrement: seats },
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) throw new Error("Version conflict");

        const reservationId = uuidv4();
        await tx.reservation.create({
          data: {
            reservationId,
            partnerId,
            seats,
            status: "confirmed",
            eventId: EVENT_ID,
          },
        });

        return reservationId;
      });

      return res.status(201).json({
        reservationId: result,
        seats,
        status: "confirmed",
      });
    } catch (err: any) {
      if (err.message === "Version conflict") continue;
      console.error(err);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  return res.status(409).json({ error: "Concurrent update, try again" });
};

/**
 * Cancel an existing reservation (seat release)
 */
export const cancelReservation = async (req: Request, res: Response) => {
  const { reservationId } = req.params;

  const reservation = await prisma.reservation.findUnique({
    where: { reservationId },
  });
  if (!reservation || reservation.status === "cancelled")
    return res.status(404).json({ error: "Not found or already cancelled" });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const event = await prisma.event.findUnique({
      where: { eventId: EVENT_ID },
      select: { availableSeats: true, version: true },
    });
    if (!event)
      return res.status(500).json({ error: "Event missing" });

    try {
      const success = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.event.updateMany({
          where: { eventId: EVENT_ID, version: event.version },
          data: {
            availableSeats: { increment: reservation.seats },
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) throw new Error("Version conflict");

        await tx.reservation.delete({
          where: { reservationId },
        });

        return true;
      });

      if (success) return res.status(204).send();
    } catch (err: any) {
      if (err.message === "Version conflict") continue;
      console.error(err);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  res.status(409).json({ error: "Concurrent update, try again" });
};

/**
 * Get all reservations for the event
 */
export const getAllReservations = async (req: Request, res: Response) => {
  const reservations = await prisma.reservation.findMany({
    where: { eventId: EVENT_ID },
    select: {
      reservationId: true,
      partnerId: true,
      seats: true,
      status: true,
      createdAt: true,
      eventId: true,
    },
  });

  return res.json(reservations);
};
