import express, {
  type Request,
  type Response,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import problemRoutes from "./routes/problem.routes.js";
import testcaseRoutes from "./routes/testcase.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get(
  "/",
  (_req: Request, res: Response) => {
    res.send(
      "CodeJudge API Server is running 🚀"
    );
  }
);

app.use(
  "/api/problems",
  problemRoutes
);

app.use(
  "/api/testcases",
  testcaseRoutes
);

app.use(
  "/api/submissions",
  submissionRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/leaderboard",
  leaderboardRoutes
);

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(
      `Server CodeJudge berjalan di http://localhost:${port}`
    );
  });
}

export default app;