import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db/index.js";
import { testCase } from "../db/schema.js";

const router = Router();

// GET semua test case
router.get("/", async (req, res) => {
    try {
        const testCases = await db.select().from(testCase);

        res.json(testCases);
    } catch (error) {
        console.error("Error mengambil test cases:", error);

        res.status(500).json({
            message: "Gagal mengambil data test cases",
        });
    }
});

// POST membuat test case
router.post("/", async (req, res) => {
    try {
        const {
            problemId,
            input,
            expectedOutput,
            isSample,
        } = req.body;

        if (!problemId || !input || !expectedOutput) {
            return res.status(400).json({
                message: "problemId, input, dan expectedOutput wajib diisi",
            });
        }

        const newTestCase = {
            id: crypto.randomUUID(),
            problemId,
            input,
            expectedOutput,
            isSample: isSample ?? false,
            createdAt: new Date(),
        };

        await db.insert(testCase).values(newTestCase);

        res.status(201).json({
            message: "Test case berhasil dibuat",
            testCase: newTestCase,
        });
    } catch (error) {
        console.error("Error membuat test case:", error);

        res.status(500).json({
            message: "Gagal membuat test case",
        });
    }
});

export default router;