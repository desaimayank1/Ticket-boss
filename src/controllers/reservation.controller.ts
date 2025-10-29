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

  const existing = await prisma.reservation.findFirst({
    where: { partnerId, status: 'confirmed' }
  });

  if (existing) {
    return res.status(400).json({ error: "Partner already has an active reservation" });
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const event = await prisma.event.findUnique({
      where: { eventId: EVENT_ID },
      select: { availableSeats: true, version: true },
    });
    if (!event)
      return res.status(500).json({ error: "Event not found" });

    if (event.availableSeats < seats)
      return res.status(409).json({ error: "Not enough seats left" ,  remainingSeats: event.availableSeats, });
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


export const updateReservation = async (req: Request, res: Response) => {
  const { reservationId } = req.params;
  const { seats: newSeats } = req.body;

  if (!Number.isInteger(newSeats) || newSeats <= 0 || newSeats > 10) {
    return res.status(400).json({ error: "Seats must be between 1 and 10" });
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { reservationId },
      include: { event: true },
    });

    if (!reservation || reservation.status !== "confirmed") {
      return res
        .status(404)
        .json({ error: "Reservation not found or already cancelled" });
    }

    const seatDiff = newSeats - reservation.seats;
    if (seatDiff === 0) {
      return res.status(200).json({ message: "No change in seats" });
    }

    let success = false;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
      const event = await prisma.event.findUnique({
        where: { eventId: EVENT_ID },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (seatDiff > 0 && event.availableSeats < seatDiff) {
        return res.status(409).json({ error: "Not enough seats left" });
      }

      let eventUpdateData;

      if (seatDiff > 0) {
        eventUpdateData = {
          availableSeats: { decrement: seatDiff },
          version: { increment: 1 },
        };
      } else {
        eventUpdateData = {
          availableSeats: { increment: Math.abs(seatDiff) },
          version: { increment: 1 },
        };
      }

      // optimistic concurrency control using version
      const updateEvent = await prisma.event.updateMany({
        where: { eventId: EVENT_ID, version: event.version },
        data: eventUpdateData,
      });

      if (updateEvent.count === 1) {
        await prisma.reservation.update({
          where: { reservationId },
          data: { seats: newSeats },
        });
        success = true;
      }
    }

    if (!success) {
      return res
        .status(409)
        .json({ error: "Concurrent update detected, please retry" });
    }

    return res.status(200).json({
      reservationId,
      newSeats,
      status: "updated",
    });
  } catch (err) {
    console.error("Error updating reservation:", err);
    return res.status(500).json({ error: "Server error" });
  }
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
