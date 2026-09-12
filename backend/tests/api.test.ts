import { describe, expect, test } from "vitest";
import request from "supertest";
import app from "../src/index.js";

const TEST_USER_ID =
  process.env.TEST_USER_ID || "1de9N8ZMi8AjvuzljliRJt3pHvmFzTnt";
const TEST_PROBLEM_ID =
  process.env.TEST_PROBLEM_ID || "997de86a-859f-48f4-a978-8e9c99ed6dea";

const VALID_SOURCE_CODE = `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b;
    return 0;
}
`;

const FINAL_STATUSES = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILATION_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "JUDGING_ERROR",
];

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function createTestSubmission(): Promise<string> {
  if (!TEST_PROBLEM_ID) {
    throw new Error("TEST_PROBLEM_ID belum diatur di file .env");
  }

  const response = await request(app)
    .post("/api/submissions")
    .send({
      userId: TEST_USER_ID,
      problemId: TEST_PROBLEM_ID,
      language: "cpp",
      sourceCode: VALID_SOURCE_CODE,
    });

  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty("submission");
  expect(response.body.submission).toHaveProperty("id");

  return response.body.submission.id as string;
}

async function pollSubmissionUntilFinished(submissionId: string) {
  const maxAttempts = 45;
  const pollingInterval = 800;

  await wait(500);

  let finalResponse;
  let finalStatus = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    finalResponse = await request(app).get(
      `/api/submissions/${submissionId}`
    );

    expect(finalResponse.status).toBe(200);
    expect(finalResponse.body).toHaveProperty("submission");

    finalStatus = finalResponse.body.submission.status;
    console.log(`Judge polling attempt ${attempt}: ${finalStatus}`);

    if (FINAL_STATUSES.includes(finalStatus)) {
      break;
    }

    await wait(pollingInterval);
  }

  expect(FINAL_STATUSES).toContain(finalStatus);
  return finalResponse;
}

describe("CodeJudge API - End-to-End Flow", () => {
  test("GET /api/submissions/:id/stream harus membuka stream SSE dengan header yang benar", async () => {
      const submissionId = await createTestSubmission();

      await new Promise<void>((resolve, reject) => {
        const req = request(app)
          .get(`/api/submissions/${submissionId}/stream`)
          .buffer(false);

        req.end((err, res) => {
          if (err && !err.message.includes("aborted")) {
            return reject(err);
          }
        });

        req.on("response", (res) => {
          try {
            expect(res.statusCode).toBe(200);
            expect(res.headers["content-type"]).toContain("text/event-stream");

            res.on("data", (chunk: Buffer) => {
              const text = chunk.toString();
              if (text.includes("data:")) {
                res.destroy();
                resolve();
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      });
    },
    10000
  );

  test("GET / harus mengembalikan status 200", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("CodeJudge API Server is running");
  });

  test("GET /api/problems harus mengambil daftar problem", async () => {
    const response = await request(app).get("/api/problems");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("POST /api/problems harus membuat problem baru jika data lengkap", async () => {
    const response = await request(app)
      .post("/api/problems")
      .send({
        title: "Test Problem Coverage",
        description: "Deskripsi soal untuk automasi testing",
        inputFormat: "Dua angka integer",
        outputFormat: "Satu angka hasil penjumlahan",
        constraints: "1 <= A, B <= 100",
        difficulty: "easy",
        timeLimit: "1",
        memoryLimit: "256",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("problem");
    expect(response.body.problem).toHaveProperty("id");
    expect(response.body.problem.title).toBe("Test Problem Coverage");
  });

  test("POST /api/problems tanpa data wajib harus mengembalikan 400", async () => {
    const response = await request(app)
      .post("/api/problems")
      .send({
        title: "Judul Tanpa Field Lain",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("GET /api/testcases harus mengambil daftar test case", async () => {
    const response = await request(app).get("/api/testcases");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("POST /api/testcases harus membuat test case baru", async () => {
    if (!TEST_PROBLEM_ID) {
      throw new Error("TEST_PROBLEM_ID belum diatur di file .env");
    }

    const response = await request(app)
      .post("/api/testcases")
      .send({
        problemId: TEST_PROBLEM_ID,
        input: "5 10",
        expectedOutput: "15",
        isSample: true,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("testCase");
    expect(response.body.testCase).toHaveProperty("id");
    expect(response.body.testCase.problemId).toBe(TEST_PROBLEM_ID);
  });

  test("POST /api/testcases tanpa data wajib harus mengembalikan 400", async () => {
    const response = await request(app)
      .post("/api/testcases")
      .send({
        input: "5 10",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("POST /api/submissions harus membuat submission dan menjalankan judge", async () => {
    if (!TEST_PROBLEM_ID) {
      throw new Error("TEST_PROBLEM_ID belum diatur di file .env");
    }

    const response = await request(app)
      .post("/api/submissions")
      .send({
        userId: TEST_USER_ID,
        problemId: TEST_PROBLEM_ID,
        language: "cpp",
        sourceCode: VALID_SOURCE_CODE,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("submission");
    expect(response.body.submission).toHaveProperty("id");

    expect(response.body.submission.userId).toBe(TEST_USER_ID);
    expect(response.body.submission.problemId).toBe(TEST_PROBLEM_ID);
    expect(response.body.submission.language).toBe("cpp");
    expect(response.body.submission.sourceCode).toBe(VALID_SOURCE_CODE);
    expect([
      "PENDING",
      "JUDGING",
      "ACCEPTED",
      "WRONG_ANSWER",
      "COMPILATION_ERROR",
      "RUNTIME_ERROR",
      "TIME_LIMIT_EXCEEDED",
      "JUDGING_ERROR",
    ]).toContain(response.body.submission.status);
  });

  test("GET /api/submissions dengan userId harus mengembalikan submission history", async () => {
    const response = await request(app)
      .get("/api/submissions")
      .query({
        userId: TEST_USER_ID,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("submissions");
    expect(Array.isArray(response.body.submissions)).toBe(true);
  });

  test("GET /api/submissions/:id harus mengambil detail submission", async () => {
    const submissionId = await createTestSubmission();

    const response = await request(app).get(
      `/api/submissions/${submissionId}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("submission");
    expect(response.body.submission.id).toBe(submissionId);
    expect(response.body.submission.userId).toBe(TEST_USER_ID);
  });

  test("GET /api/submissions harus menampilkan submission yang baru dibuat", async () => {
    const submissionId = await createTestSubmission();

    const response = await request(app)
      .get("/api/submissions")
      .query({
        userId: TEST_USER_ID,
      });

    expect(response.status).toBe(200);

    const createdSubmission = response.body.submissions.find(
      (submission: any) => submission.id === submissionId
    );

    expect(createdSubmission).toBeDefined();
    expect(createdSubmission.userId).toBe(TEST_USER_ID);
  });

  test("GET /api/submissions/:id harus melakukan polling sampai judge selesai", async () => {
    const submissionId = await createTestSubmission();
    const finalResponse = await pollSubmissionUntilFinished(submissionId);

    expect(finalResponse?.body.submission.id).toBe(submissionId);
  },
  50000
  );

  test("GET /api/dashboard/stats dengan userId harus mengembalikan statistics", async () => {
    const response = await request(app)
      .get("/api/dashboard/stats")
      .query({
        userId: TEST_USER_ID,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("totalProblems");
    expect(response.body).toHaveProperty("solvedProblems");
    expect(response.body).toHaveProperty("totalSubmissions");
    expect(response.body).toHaveProperty("accuracy");

    expect(typeof response.body.totalProblems).toBe("number");
    expect(typeof response.body.solvedProblems).toBe("number");
    expect(typeof response.body.totalSubmissions).toBe("number");
    expect(typeof response.body.accuracy).toBe("number");
  });

  test("GET /api/dashboard/stats harus mencerminkan submission user", async () => {
    await createTestSubmission();

    const response = await request(app)
      .get("/api/dashboard/stats")
      .query({
        userId: TEST_USER_ID,
      });

    expect(response.status).toBe(200);
    expect(response.body.totalSubmissions).toBeGreaterThanOrEqual(1);
    expect(response.body.solvedProblems).toBeGreaterThanOrEqual(0);
    expect(response.body.accuracy).toBeGreaterThanOrEqual(0);
    expect(response.body.accuracy).toBeLessThanOrEqual(100);
  });

  test("GET /api/leaderboard harus mengembalikan leaderboard", async () => {
    const response = await request(app).get("/api/leaderboard");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("leaderboard");
    expect(Array.isArray(response.body.leaderboard)).toBe(true);
  });

  test("GET /api/leaderboard harus memproses user yang melakukan submission", async () => {
    const response = await request(app).get("/api/leaderboard");

    expect(response.status).toBe(200);

    const currentUser = response.body.leaderboard.find(
      (entry: any) => entry.userId === TEST_USER_ID
    );

    expect(currentUser).toBeDefined();
    expect(currentUser).toHaveProperty("rank");
    expect(currentUser).toHaveProperty("name");
    expect(currentUser).toHaveProperty("solvedProblems");
    expect(currentUser).toHaveProperty("acceptedSubmissions");
    expect(currentUser).toHaveProperty("totalSubmissions");
    expect(currentUser).toHaveProperty("accuracy");
    expect(currentUser).toHaveProperty("score");
  });

  test("GET /api/leaderboard harus memiliki struktur ranking yang benar", async () => {
    const response = await request(app).get("/api/leaderboard");

    expect(response.status).toBe(200);

    const leaderboard = response.body.leaderboard;
    expect(Array.isArray(leaderboard)).toBe(true);

    leaderboard.forEach((entry: any, index: number) => {
      expect(entry.rank).toBe(index + 1);
      expect(typeof entry.userId).toBe("string");
      expect(typeof entry.name).toBe("string");
      expect(typeof entry.solvedProblems).toBe("number");
      expect(typeof entry.acceptedSubmissions).toBe("number");
      expect(typeof entry.totalSubmissions).toBe("number");
      expect(typeof entry.accuracy).toBe("number");
      expect(typeof entry.score).toBe("number");
    });
  });

  test("GET /api/dashboard/stats tanpa userId harus mengembalikan 400", async () => {
    const response = await request(app).get("/api/dashboard/stats");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("GET /api/submissions tanpa userId harus mengembalikan 400", async () => {
    const response = await request(app).get("/api/submissions");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("POST /api/submissions tanpa data wajib harus mengembalikan 400", async () => {
    const response = await request(app)
      .post("/api/submissions")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("POST /api/submissions dengan data tidak lengkap harus mengembalikan 400", async () => {
    const response = await request(app)
      .post("/api/submissions")
      .send({
        userId: TEST_USER_ID,
        problemId: TEST_PROBLEM_ID,
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("GET /api/submissions/:id dengan ID yang tidak ada harus mengembalikan 404", async () => {
    const response = await request(app).get(
      "/api/submissions/submission-id-yang-tidak-ada"
    );

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });

  test("POST /api/submissions dengan bahasa yang tidak didukung harus berakhir COMPILATION_ERROR", async () => {
    if (!TEST_PROBLEM_ID) {
      throw new Error("TEST_PROBLEM_ID belum diatur di file .env");
    }

    const response = await request(app)
      .post("/api/submissions")
      .send({
        userId: TEST_USER_ID,
        problemId: TEST_PROBLEM_ID,
        language: "ruby",
        sourceCode: "puts 'Hello World'",
      });

    expect(response.status).toBe(201);
    expect(response.body.submission).toHaveProperty("id");

    const submissionId = response.body.submission.id;
    const finalResponse = await pollSubmissionUntilFinished(submissionId);

    expect(finalResponse?.body.submission.status).toBe("COMPILATION_ERROR");
  });

  test("POST /api/submissions dengan sourceCode kosong harus mengembalikan 400", async () => {
    const response = await request(app)
      .post("/api/submissions")
      .send({
        userId: TEST_USER_ID,
        problemId: TEST_PROBLEM_ID,
        language: "cpp",
        sourceCode: "",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("POST /api/submissions dengan sourceCode melebihi 50 KB harus mengembalikan 400", async () => {
    const hugeSourceCode = "a".repeat(50001);

    const response = await request(app)
      .post("/api/submissions")
      .send({
        userId: TEST_USER_ID,
        problemId: TEST_PROBLEM_ID,
        language: "cpp",
        sourceCode: hugeSourceCode,
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("50 KB");
  });

  test("POST /api/submissions dengan payload SQL Injection tidak boleh melempar error database", async () => {
    if (!TEST_PROBLEM_ID) {
      throw new Error("TEST_PROBLEM_ID belum diatur di file .env");
    }

    const sqlInjectionPayload = `
      // ' OR '1'='1'; DROP TABLE submission; --
      #include <iostream>
      using namespace std;
      int main() { cout << "Safe"; return 0; }
    `;

    const response = await request(app)
      .post("/api/submissions")
      .send({
        userId: TEST_USER_ID,
        problemId: TEST_PROBLEM_ID,
        language: "cpp",
        sourceCode: sqlInjectionPayload,
      });

    expect(response.status).toBe(201);
    expect(response.body.submission).toHaveProperty("id");
  });

  test("GET /api/submissions/:id harus memberikan pesan JSON bersih tanpa stack trace pada ID tidak valid", async () => {
    const response = await request(app).get(
      "/api/submissions/00000000-0000-0000-0000-000000000000"
    );

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
    expect(typeof response.body.message).toBe("string");
    expect(JSON.stringify(response.body)).not.toContain("syntax error");
    expect(JSON.stringify(response.body)).not.toContain("node_modules");
  });

  test("GET /api/submissions dengan userId yang belum pernah submit harus mengembalikan array kosong", async () => {
    const response = await request(app)
      .get("/api/submissions")
      .query({
        userId: "user_fiktif_tanpa_submission_999",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("submissions");
    expect(Array.isArray(response.body.submissions)).toBe(true);
    expect(response.body.submissions.length).toBe(0);
  });
});