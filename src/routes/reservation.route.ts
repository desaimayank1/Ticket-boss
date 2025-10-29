import { Router, type Router as ExpressRouter } from "express";
import { createReservation, cancelReservation, getAllReservations, updateReservation } from "../controllers/reservation.controller";
import { validate } from "../middlewares/validate";
import { createreservationSchema, updateReservationSchema } from "../validators/reservationSchema";

const reservationsRouter: ExpressRouter = Router();

reservationsRouter.route("/").get(getAllReservations);
reservationsRouter.route("/").post(validate(createreservationSchema), createReservation);
reservationsRouter.route("/:reservationId").patch(validate(updateReservationSchema), updateReservation);
reservationsRouter.route("/:reservationId").delete(cancelReservation);

export default reservationsRouter;