import { Router, type Router as ExpressRouter } from "express";
import { createReservation,cancelReservation,getAllReservations } from "../controllers/reservation.controller";

const reservationsRouter: ExpressRouter = Router();

reservationsRouter.route("/").post(createReservation);
reservationsRouter.route("/:reservationId").delete(cancelReservation);
reservationsRouter.route("/").get(getAllReservations);

export default reservationsRouter;