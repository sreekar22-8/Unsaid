import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const status =
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : error &&
            typeof error === "object" &&
            "issues" in error &&
            Array.isArray(error.issues)
          ? 400
          : 500;
    const isValidationError =
      error &&
      typeof error === "object" &&
      "issues" in error &&
      Array.isArray(error.issues);
    const message =
      isValidationError
        ? "Invalid request."
        : error instanceof Error
          ? error.message
          : "Request failed.";

    logger.error(
      { error: error instanceof Error ? error.message : String(error), status },
      "API request failed",
    );

    if (res.headersSent) return;
    res.status(status).json({
      error: status >= 500 ? "Internal server error." : message,
    });
  },
);

export default app;
