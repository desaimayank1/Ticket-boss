import { Router, type Router as ExpressRouter } from "express";
import { getEventStatus } from "../controllers/event.controller";

const eventRouter: ExpressRouter = Router();

eventRouter.route("/").get(getEventStatus);

export default eventRouter;