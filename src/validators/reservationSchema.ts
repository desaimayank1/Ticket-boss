import { z } from "zod";

export const createreservationSchema = z.object({
    partnerId: z.string({
        required_error: "partnerId is required",
        invalid_type_error: "partnerId must be a string",
    })
        .min(1, "partnerId cannot be empty")
        .describe("Unique partner identifier"),

    seats: z.number({
        required_error: "Seats field is required",
        invalid_type_error: "Seats must be an integer",
    })
        .int("seats must be an integer")
        .min(1, "seats must be 1–10")
        .max(10, "seats must be 1–10")
        .describe("Number of seats to reserve")
});

export type ReservationInput = z.infer<typeof createreservationSchema>;

export const updateReservationSchema = z.object({
    seats: z.number({
        required_error: "Seats field is required",
        invalid_type_error: "Seats must be an integer",
    })
        .int("seats must be an integer")
        .min(1, "seats must be 1–10")
        .max(10, "seats must be 1–10")
        .describe("Number of seats to update"),
});