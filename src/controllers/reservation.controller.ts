import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import prisma from "../PrimaClient";
const MAX_RETRIES = 6;
const EVENT_ID = "node-meetup-2025";

export const createReservation = async (req: Request, res: Response) => {
  const { partnerId, seats } = req.body;

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
      return res.status(409).json({ error: "Not enough seats left", remainingSeats: event.availableSeats, });

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

export const cancelReservation = async (req: Request, res: Response) => {
  const { reservationId } = req.params;

  const reservation = await prisma.reservation.findUnique({
    where: { reservationId },
  });

  if (!reservation || reservation.status === "cancelled")
    return res.status(404).json({ error: "Reservation not found or already cancelled" });

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

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {

      const event = await prisma.event.findUnique({
        where: { eventId: EVENT_ID },
        select: { availableSeats: true, version: true },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (seatDiff > 0 && event.availableSeats < seatDiff) {
        return res.status(409).json({ error: "Not enough seats left" });
      }

      try {
        const success = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const updated = await tx.event.updateMany({
            where: { eventId: EVENT_ID, version: event.version },
            data: {
              availableSeats: seatDiff > 0 ? { decrement: seatDiff } : { increment: Math.abs(seatDiff) },
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) throw new Error("Version conflict");

          await tx.reservation.update({
            where: { reservationId },
            data: { seats: newSeats },
          });

          return true;
        }
        );

        if (success) {
          return res.status(200).json({
            reservationId,
            newSeats,
            status: "updated",
          });
        }

      } catch (err: any) {
        if (err.message === "Version conflict") continue;
        console.error("Error updating reservation:", err);
        return res.status(500).json({ error: "Server error" });
      }
    }

    return res.status(409).json({ error: "Concurrent update detected, please retry" });

  } catch (err) {
    console.error("Error updating reservation:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const getAllReservations = async (req: Request, res: Response) => {

  try {

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

  }
  catch (error) {
    console.error("Error fetching reservations", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
