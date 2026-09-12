import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { submission, user } from "../db/schema.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const leaderboard = await db
      .select({
        userId: user.id,
        name: user.name,

        solvedProblems: sql<number>`
          count(
            distinct case
              when ${submission.status} = 'ACCEPTED'
              then ${submission.problemId}
            end
          )
        `,

        acceptedSubmissions: sql<number>`
          count(
            case
              when ${submission.status} = 'ACCEPTED'
              then ${submission.id}
            end
          )
        `,

        totalSubmissions: sql<number>`
          count(${submission.id})
        `,
      })
      .from(user)
      .leftJoin(
        submission,
        sql`${submission.userId} = ${user.id}`
      )
      .groupBy(user.id, user.name)
      .orderBy(
        sql`
          count(
            distinct case
              when ${submission.status} = 'ACCEPTED'
              then ${submission.problemId}
            end
          ) desc,

          count(
            case
              when ${submission.status} = 'ACCEPTED'
              then ${submission.id}
            end
          ) desc,

          count(${submission.id}) asc,

          ${user.name} asc
        `
      );

    const formattedLeaderboard = leaderboard.map(
      (item, index) => {
        const solvedProblems = Number(
          item.solvedProblems ?? 0
        );

        const acceptedSubmissions = Number(
          item.acceptedSubmissions ?? 0
        );

        const totalSubmissions = Number(
          item.totalSubmissions ?? 0
        );

        const accuracy =
          totalSubmissions > 0
            ? Math.round(
                (acceptedSubmissions /
                  totalSubmissions) *
                  100
              )
            : 0;

        const score = solvedProblems * 100;

        return {
          rank: index + 1,
          userId: item.userId,
          name: item.name,
          solvedProblems,
          acceptedSubmissions,
          totalSubmissions,
          accuracy,
          score,
        };
      }
    );

    return res.json({
      leaderboard: formattedLeaderboard,
    });
  } catch (error) {
    console.error(
      "Error mengambil leaderboard:",
      error
    );

    return res.status(500).json({
      message: "Gagal mengambil leaderboard",
    });
  }
});

export default router;