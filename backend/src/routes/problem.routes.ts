import { Router } from "express";
import { db } from "../db/index.js";
import { problem } from "../db/schema.js";

const router = Router();

// GET semua problem
router.get("/", async (req, res) => {
    try {
        const problems = await db.select().from(problem);

        res.json(problems);
    } catch (error) {
        console.error("Error mengambil problems:", error);

        res.status(500).json({
            message: "Gagal mengambil data problems",
        });
    }
});

// POST membuat problem
router.post("/", async (req, res) => {
    try {
        const {
            title,
            description,
            inputFormat,
            outputFormat,
            constraints,
            difficulty,
            timeLimit,
            memoryLimit,
        } = req.body;

        if (
            !title ||
            !description ||
            !inputFormat ||
            !outputFormat
        ) {
            return res.status(400).json({
                message: "Field wajib belum lengkap",
            });
        }

        const now = new Date();

        const newProblem = {
            id: crypto.randomUUID(),
            title,
            description,
            inputFormat,
            outputFormat,
            constraints: constraints || null,
            difficulty: difficulty || "easy",
            timeLimit: timeLimit || "1",
            memoryLimit: memoryLimit || "256",
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(problem).values(newProblem);

        res.status(201).json({
            message: "Problem berhasil dibuat",
            problem: newProblem,
        });
    } catch (error) {
        console.error("Error membuat problem:", error);

        res.status(500).json({
            message: "Gagal membuat problem",
        });
    }
});

export default router;