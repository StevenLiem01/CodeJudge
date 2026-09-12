import { Router } from "express";
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { submission, testCase } from "../db/schema.js";
import { executeSubmission } from "../codeRunner.js";
import { submissionEmitter } from "../submissionEmitter.js";

const router = Router();
const MAX_SOURCE_CODE_LENGTH = 50000;

async function judgeSubmission(
  submissionId: string,
  problemId: string,
  language: string,
  sourceCode: string
) {
  try {
    await db
      .update(submission)
      .set({
        status: "JUDGING",
      })
      .where(eq(submission.id, submissionId));

    const testCases = await db
      .select()
      .from(testCase)
      .where(eq(testCase.problemId, problemId));

    if (testCases.length === 0) {
      await db
        .update(submission)
        .set({
          status: "JUDGING_ERROR",
        })
        .where(eq(submission.id, submissionId));

      return;
    }

    let finalStatus = "ACCEPTED";
    let finalRuntime: number | null = null;

    for (const currentTestCase of testCases) {
      const result = await executeSubmission(
        language,
        sourceCode,
        currentTestCase.input,
        currentTestCase.expectedOutput
      );

      finalStatus = result.status;
      finalRuntime = result.runtime;

      if (result.status !== "ACCEPTED") {
        break;
      }
    }

    await db
      .update(submission)
      .set({
        status: finalStatus,
        runtime:
          finalRuntime !== null
            ? String(finalRuntime)
            : null,
      })
      .where(eq(submission.id, submissionId));

    console.log(
      `Submission ${submissionId} selesai dengan status ${finalStatus}`
    );
    submissionEmitter.emit('update:${submissionId}', {
      id: submissionId,
      status: finalStatus,
      runtime: finalRuntime,
    });
  } catch (error) {
    console.error(
      `Error judge submission ${submissionId}:`,
      error
    );

    await db
      .update(submission)
      .set({
        status: "JUDGING_ERROR",
      })
      .where(eq(submission.id, submissionId));
  }
}

router.post("/", async (req, res) => {
  try {
    const {
      userId,
      problemId,
      language,
      sourceCode,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId wajib diisi",
      });
    }

    if (!problemId) {
      return res.status(400).json({
        message: "problemId wajib diisi",
      });
    }

    if (!language) {
      return res.status(400).json({
        message: "language wajib diisi",
      });
    }

    if (!sourceCode || typeof sourceCode !== "string") {
      return res.status(400).json({
        message: "sourceCode wajib diisi",
      });
    }

    if (sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      return res.status(400).json({
        message: "sourceCode melebihi batas maksimal 50 KB",
      });
    }

    const submissionId = randomUUID();

    const newSubmission = await db
      .insert(submission)
      .values({
        id: submissionId,
        userId,
        problemId,
        language,
        sourceCode,
        status: "PENDING",
        createdAt: new Date(),
      })
      .returning();

    const createdSubmission = newSubmission[0];

    if (!createdSubmission) {
      return res.status(500).json({
        message: "Gagal membuat submission.",
      });
    }

    res.status(201).json({
      message:
        "Submission berhasil dibuat dan sedang diproses.",
      submission: createdSubmission,
    });

    setImmediate(() => {
      void judgeSubmission(
        submissionId,
        problemId,
        language,
        sourceCode
      );
    });
  } catch (error) {
    console.error(
      "Error membuat submission:",
      error
    );

    return res.status(500).json({
      message: "Gagal membuat submission",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        message: "userId wajib diisi",
      });
    }

    const submissions = await db
      .select()
      .from(submission)
      .where(eq(submission.userId, userId))
      .orderBy(desc(submission.createdAt));

    return res.json({
      submissions,
    });
  } catch (error) {
    console.error(
      "Error mengambil submission:",
      error
    );

    return res.status(500).json({
      message: "Gagal mengambil submission",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(submission)
      .where(eq(submission.id, id));

    if (result.length === 0) {
      return res.status(404).json({
        message: "Submission tidak ditemukan",
      });
    }

    return res.json({
      submission: result[0],
    });
  } catch (error) {
    console.error(
      "Error mengambil detail submission:",
      error
    );

    return res.status(500).json({
      message: "Gagal mengambil detail submission",
    });
  }
});

router.get("/:id/stream", async (req, res) => {
  const { id } = req.params;

  const result = await db
    .select()
    .from(submission)
    .where(eq(submission.id, id));

  const currentSubmission = result[0];

  if (!currentSubmission) {
    return res.status(404).json({ message: "Submission tidak ditemukan" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const FINAL_STATUSES = [
    "ACCEPTED",
    "WRONG_ANSWER",
    "COMPILATION_ERROR",
    "RUNTIME_ERROR",
    "TIME_LIMIT_EXCEEDED",
    "JUDGING_ERROR",
  ];

  // Kirim data awal
  res.write(`data: ${JSON.stringify(currentSubmission)}\n\n`);

  // Jika di DB statusnya sudah final sejak awal, langsung tutup koneksi!
  if (FINAL_STATUSES.includes(currentSubmission.status)) {
    res.end();
    return;
  }

  const eventName = `update:${id}`;

  const listener = (updatedData: any) => {
    res.write(`data: ${JSON.stringify(updatedData)}\n\n`);

    // Segera tutup stream bila event baru menunjukkan proses judge selesai
    if (FINAL_STATUSES.includes(updatedData.status)) {
      submissionEmitter.off(eventName, listener);
      res.end();
    }
  };

  submissionEmitter.on(eventName, listener);

  req.on("close", () => {
    submissionEmitter.off(eventName, listener);
  });
});

export default router;