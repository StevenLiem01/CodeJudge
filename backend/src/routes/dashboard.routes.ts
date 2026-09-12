import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { problem, submission } from "../db/schema.js";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        message: "userId wajib diisi",
      });
    }

    const [totalProblemsResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(problem);

    const [totalSubmissionsResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(submission)
      .where(eq(submission.userId, userId));

    const [acceptedSubmissionsResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(submission)
      .where(
        sql`${submission.userId} = ${userId} AND ${submission.status} = 'ACCEPTED'`
      );

    const [solvedProblemsResult] = await db
      .select({
        count: sql<number>`count(distinct ${submission.problemId})`,
      })
      .from(submission)
      .where(
        sql`${submission.userId} = ${userId} AND ${submission.status} = 'ACCEPTED'`
      );

    const totalProblems = Number(
      totalProblemsResult?.count ?? 0
    );

    const totalSubmissions = Number(
      totalSubmissionsResult?.count ?? 0
    );

    const acceptedSubmissions = Number(
      acceptedSubmissionsResult?.count ?? 0
    );

    const solvedProblems = Number(
      solvedProblemsResult?.count ?? 0
    );

    const accuracy =
      totalSubmissions > 0
        ? Math.round(
            (acceptedSubmissions / totalSubmissions) * 100
          )
        : 0;

    return res.json({
      totalProblems,
      solvedProblems,
      totalSubmissions,
      accuracy,
    });
  } catch (error) {
    console.error(
      "Error mengambil dashboard statistics:",
      error
    );

    return res.status(500).json({
      message: "Gagal mengambil dashboard statistics",
    });
  }
});

export default router;