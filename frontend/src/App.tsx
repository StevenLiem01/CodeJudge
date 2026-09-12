import "./App.css";
import { CodeJudgeEditor } from "./components/CodeJudgeEditor";
import { useEffect, useState } from "react";
import { authClient } from "./lib/auth";

interface Problem {
  id: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string | null;
  difficulty: string;
  timeLimit: string;
  memoryLimit: string;
  createdAt: string;
  updatedAt: string;
}

interface Submission {
  id: string;
  userId: string;
  problemId: string;
  language: string;
  sourceCode: string;
  status: string;
  runtime: string | null;
  memory: string | null;
  createdAt: string;
}

interface DashboardStats {
  totalProblems: number;
  solvedProblems: number;
  totalSubmissions: number;
  accuracy: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  solvedProblems: number;
  acceptedSubmissions: number;
  totalSubmissions: number;
  accuracy: number;
  score: number;
}

function App() {
  const { data: session, isPending } = authClient.useSession();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProblems: 0,
    solvedProblems: 0,
    totalSubmissions: 0,
    accuracy: 0,
  });

  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = useState(false);

  const [isRegister, setIsRegister] = useState(false);
  const [currentPage, setCurrentPage] = useState<
    "dashboard" | "problems" | "history" | "submission-detail" | "leaderboard"
  >("dashboard");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  useEffect(() => {
    if (currentPage !== "leaderboard") {
      return;
    }

    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [currentPage]);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/problems");

        if (!response.ok) {
          throw new Error("Gagal mengambil data problems");
        }

        const data: Problem[] = await response.json();

        setProblems(data);
      } catch (error) {
        console.error("Error mengambil problems:", error);
      } finally {
        setIsLoadingProblems(false);
      }
    };

    fetchProblems();
  }, []);

  const fetchSubmissionHistory = async () => {
    if (!session?.user.id) {
      return;
    }

    setIsLoadingSubmissions(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/submissions?userId=${session.user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil riwayat submission.");
      }

      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error("Error mengambil submission history:", error);
      alert("Gagal mengambil riwayat submission.");
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const fetchSubmissionDetail = async (submissionId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/submissions/${submissionId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil detail submission.");
      }

      setSelectedSubmission(data.submission);
      setCurrentPage("submission-detail");
    } catch (error) {
      console.error("Error mengambil detail submission:", error);
      alert("Gagal mengambil detail submission.");
    }
  };

  const handleOpenSubmissionHistory = async () => {
    setCurrentPage("history");
    await fetchSubmissionHistory();
  };

  const handleOpenSubmissionDetail = async (submissionId: string) => {
    await fetchSubmissionDetail(submissionId);
  };

  const handleBackToHistory = () => {
    setSelectedSubmission(null);
    setCurrentPage("history");
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Semua field harus diisi!");
      return;
    }

    const { error } = await authClient.signUp.email({
      email,
      password,
      name,
      image:
        "https://ui-avatars.com/api/?name=" + encodeURIComponent(name),
    });

    if (error) {
      alert("Gagal Register: " + error.message);
      return;
    }

    alert("Registrasi berhasil! Silakan login.");

    setIsRegister(false);
    setPassword("");
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Email dan password harus diisi!");
      return;
    }

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      alert("Gagal Login: " + error.message);
      return;
    }

    alert("Login berhasil!");
  };

  const handleLogout = async () => {
    const { error } = await authClient.signOut();

    if (error) {
      alert("Gagal Logout: " + error.message);
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setSelectedProblem(null);
    setSelectedSubmission(null);
    setSubmissions([]);
    setCurrentPage("dashboard");
  };

  const handleSelectProblem = (problem: Problem) => {
    setSelectedProblem(problem);
    setCurrentPage("problems");
  };

  const handleBackToProblems = () => {
    setSelectedProblem(null);
    setCurrentPage("problems");
  };

  const handleBackToDashboard = () => {
    setSelectedProblem(null);
    setSelectedSubmission(null);
    setCurrentPage("dashboard");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
        };

      case "WRONG_ANSWER":
        return {
          backgroundColor: "#fee2e2",
          color: "#991b1b",
        };

      case "COMPILATION_ERROR":
        return {
          backgroundColor: "#fef3c7",
          color: "#92400e",
        };

      case "RUNTIME_ERROR":
        return {
          backgroundColor: "#ffedd5",
          color: "#9a3412",
        };

      case "TIME_LIMIT_EXCEEDED":
        return {
          backgroundColor: "#fce7f3",
          color: "#9d174d",
        };

      case "PENDING":
      case "JUDGING":
        return {
          backgroundColor: "#fef9c3",
          color: "#854d0e",
        };

      case "JUDGING_ERROR":
        return {
          backgroundColor: "#fee2e2",
          color: "#991b1b",
        };

      default:
        return {
          backgroundColor: "#e5e7eb",
          color: "#374151",
        };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getProblemTitle = (problemId: string) => {
    const problem = problems.find((item) => item.id === problemId);

    return problem?.title || "Problem tidak ditemukan";
  };

  const fetchDashboardStats = async () => {
    if (!session?.user.id) {
      return;
    }

    setIsLoadingDashboardStats(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/dashboard/stats?userId=${session.user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil dashboard statistics."
        );
      }

      setDashboardStats({
        totalProblems: data.totalProblems ?? 0,
        solvedProblems: data.solvedProblems ?? 0,
        totalSubmissions: data.totalSubmissions ?? 0,
        accuracy: data.accuracy ?? 0,
      });
    } catch (error) {
      console.error("Error mengambil dashboard statistics:", error);
    } finally {
      setIsLoadingDashboardStats(false);
    }
  };

  useEffect(() => {
    if (session?.user.id && currentPage === "dashboard") {
      fetchDashboardStats();
    }
  }, [session?.user.id, currentPage]);

  if (isPending) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>Loading...</h2>
      </div>
    );
  }

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);

    try {
      const response = await fetch("http://localhost:3000/api/leaderboard");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil leaderboard.");
      }

      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error("Error mengambil leaderboard:", error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleOpenLeaderboard = async () => {
    setCurrentPage("leaderboard");
    await fetchLeaderboard();
  };

  if (session) {
    if (currentPage === "submission-detail") {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#f5f7fa",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <nav
            style={{
              backgroundColor: "#1f2937",
              color: "white",
              padding: "15px 40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>CodeJudge</h2>

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </nav>

          <main
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              padding: "40px 20px",
            }}
          >
            <button
              onClick={handleBackToHistory}
              style={{
                padding: "8px 14px",
                marginBottom: "25px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ← Kembali ke Riwayat
            </button>

            {selectedSubmission && (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "30px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "20px",
                    flexWrap: "wrap",
                    marginBottom: "30px",
                  }}
                >
                  <div>
                    <h1
                      style={{
                        marginTop: 0,
                        marginBottom: "10px",
                        color: "#111827",
                      }}
                    >
                      Submission Detail
                    </h1>

                    <p
                      style={{
                        margin: 0,
                        color: "#6b7280",
                      }}
                    >
                      {getProblemTitle(selectedSubmission.problemId)}
                    </p>
                  </div>

                  <span
                    style={{
                      ...getStatusColor(selectedSubmission.status),
                      padding: "8px 14px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    {selectedSubmission.status}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "15px",
                    marginBottom: "30px",
                  }}
                >
                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#6b7280",
                        fontSize: "13px",
                      }}
                    >
                      Language
                    </p>

                    <strong
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "#111827",
                      }}
                    >
                      {selectedSubmission.language.toUpperCase()}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#6b7280",
                        fontSize: "13px",
                      }}
                    >
                      Runtime
                    </p>

                    <strong
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "#111827",
                      }}
                    >
                      {selectedSubmission.runtime
                        ? `${selectedSubmission.runtime} ms`
                        : "-"}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#6b7280",
                        fontSize: "13px",
                      }}
                    >
                      Memory
                    </p>

                    <strong
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "#111827",
                      }}
                    >
                      {selectedSubmission.memory
                        ? `${selectedSubmission.memory} MB`
                        : "-"}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#6b7280",
                        fontSize: "13px",
                      }}
                    >
                      Submitted At
                    </p>

                    <strong
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "#111827",
                      }}
                    >
                      {formatDate(selectedSubmission.createdAt)}
                    </strong>
                  </div>
                </div>

                <h2
                  style={{
                    color: "#111827",
                    marginBottom: "15px",
                  }}
                >
                  Source Code
                </h2>

                <div
                  style={{
                    backgroundColor: "#111827",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      padding: "20px",
                      color: "#f9fafb",
                      fontFamily: "Consolas, Monaco, monospace",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                      overflowX: "auto",
                    }}
                  >
                    {selectedSubmission.sourceCode}
                  </pre>
                </div>

                <div
                  style={{
                    marginTop: "25px",
                    padding: "15px",
                    backgroundColor: getStatusColor(
                      selectedSubmission.status
                    ).backgroundColor,
                    color: getStatusColor(selectedSubmission.status).color,
                    borderRadius: "8px",
                    fontWeight: "bold",
                  }}
                >
                  Submission Status: {selectedSubmission.status}
                </div>
              </div>
            )}
          </main>
        </div>
      );
    }

    if (currentPage === "history") {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#f5f7fa",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <nav
            style={{
              backgroundColor: "#1f2937",
              color: "white",
              padding: "15px 40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>CodeJudge</h2>

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </nav>

          <main
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              padding: "40px 20px",
            }}
          >
            <button
              onClick={handleBackToDashboard}
              style={{
                padding: "8px 14px",
                marginBottom: "25px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ← Dashboard
            </button>

            <div
              style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                  marginBottom: "25px",
                }}
              >
                <div>
                  <h1
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                      color: "#111827",
                    }}
                  >
                    Riwayat Submission
                  </h1>

                  <p
                    style={{
                      margin: 0,
                      color: "#6b7280",
                    }}
                  >
                    Lihat semua submission yang pernah kamu kirim.
                  </p>
                </div>

                <button
                  onClick={fetchSubmissionHistory}
                  disabled={isLoadingSubmissions}
                  style={{
                    padding: "10px 18px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: isLoadingSubmissions
                      ? "#9ca3af"
                      : "#2563eb",
                    color: "white",
                    cursor: isLoadingSubmissions ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {isLoadingSubmissions ? "Loading..." : "Refresh"}
                </button>
              </div>

              {isLoadingSubmissions ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  Loading submission history...
                </div>
              ) : submissions.length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      color: "#374151",
                    }}
                  >
                    Belum ada submission
                  </h3>

                  <p
                    style={{
                      color: "#6b7280",
                      marginBottom: "20px",
                    }}
                  >
                    Kamu belum pernah mengirimkan kode.
                  </p>

                  <button
                    onClick={() => setCurrentPage("problems")}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Mulai Coding
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {submissions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleOpenSubmissionDetail(item.id)}
                      style={{
                        width: "100%",
                        padding: "20px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "15px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: "0 0 8px",
                              color: "#111827",
                            }}
                          >
                            {getProblemTitle(item.problemId)}
                          </h3>

                          <p
                            style={{
                              margin: 0,
                              color: "#6b7280",
                              fontSize: "14px",
                            }}
                          >
                            {item.language.toUpperCase()} ·{" "}
                            {formatDate(item.createdAt)}
                          </p>
                        </div>

                        <span
                          style={{
                            ...getStatusColor(item.status),
                            padding: "7px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          marginTop: "15px",
                          color: "#6b7280",
                          fontSize: "13px",
                        }}
                      >
                        <span>
                          Runtime:{" "}
                          {item.runtime ? `${item.runtime} ms` : "-"}
                        </span>

                        <span>
                          Memory: {item.memory ? `${item.memory} MB` : "-"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      );
    }

    if (selectedProblem) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#f5f7fa",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <nav
            style={{
              backgroundColor: "#1f2937",
              color: "white",
              padding: "15px 30px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>CodeJudge</h2>

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </nav>

          <div
            style={{
              backgroundColor: "white",
              borderBottom: "1px solid #e5e7eb",
              padding: "15px 30px",
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <button
              onClick={handleBackToProblems}
              style={{
                padding: "8px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ← Back
            </button>

            <h2
              style={{
                margin: 0,
                color: "#111827",
              }}
            >
              {selectedProblem.title}
            </h2>

            <span
              style={{
                padding: "5px 10px",
                borderRadius: "20px",
                backgroundColor: "#dcfce7",
                color: "#166534",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {selectedProblem.difficulty.toUpperCase()}
            </span>
          </div>

          <main
            style={{
              display: "grid",
              gridTemplateColumns: "40% 60%",
              minHeight: "calc(100vh - 130px)",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "30px",
                overflowY: "auto",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              <h2 style={{ color: "#111827" }}>Problem Description</h2>

              <p
                style={{
                  color: "#4b5563",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedProblem.description}
              </p>

              <h3
                style={{
                  color: "#111827",
                  marginTop: "30px",
                }}
              >
                Input Format
              </h3>

              <p
                style={{
                  color: "#4b5563",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedProblem.inputFormat}
              </p>

              <h3
                style={{
                  color: "#111827",
                  marginTop: "30px",
                }}
              >
                Output Format
              </h3>

              <p
                style={{
                  color: "#4b5563",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedProblem.outputFormat}
              </p>

              <h3
                style={{
                  color: "#111827",
                  marginTop: "30px",
                }}
              >
                Constraints
              </h3>

              <p
                style={{
                  color: "#4b5563",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedProblem.constraints || "Tidak ada constraint khusus."}
              </p>

              <div
                style={{
                  marginTop: "30px",
                  padding: "15px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    margin: "5px 0",
                    color: "#4b5563",
                  }}
                >
                  <strong>Time Limit:</strong> {selectedProblem.timeLimit}s
                </p>

                <p
                  style={{
                    margin: "5px 0",
                    color: "#4b5563",
                  }}
                >
                  <strong>Memory Limit:</strong> {selectedProblem.memoryLimit}{" "}
                  MB
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#1e1e1e",
                padding: "20px",
              }}
            >
              <CodeJudgeEditor
                userId={session.user.id}
                problemId={selectedProblem.id}
                backendUrl="http://localhost:3000"
              />
            </div>
          </main>
        </div>
      );
    }

    if (currentPage === "problems") {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#f5f7fa",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <nav
            style={{
              backgroundColor: "#1f2937",
              color: "white",
              padding: "15px 40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>CodeJudge</h2>

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </nav>

          <main
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              padding: "40px 20px",
            }}
          >
            <button
              onClick={handleBackToDashboard}
              style={{
                padding: "8px 14px",
                marginBottom: "25px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ← Dashboard
            </button>

            <div
              style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h1
                style={{
                  marginTop: 0,
                  color: "#111827",
                }}
              >
                Daftar Soal
              </h1>

              <p
                style={{
                  color: "#6b7280",
                  marginBottom: "25px",
                }}
              >
                Pilih problem yang ingin kamu selesaikan.
              </p>

              {isLoadingProblems ? (
                <p style={{ color: "#6b7280" }}>Loading problems...</p>
              ) : problems.length === 0 ? (
                <p style={{ color: "#6b7280" }}>Belum ada problem tersedia.</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {problems.map((problem) => (
                    <div
                      key={problem.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "20px",
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                          color: "#111827",
                        }}
                      >
                        {problem.title}
                      </h3>

                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "12px",
                        }}
                      >
                        {problem.difficulty.toUpperCase()}
                      </span>

                      <p
                        style={{
                          color: "#6b7280",
                          lineHeight: "1.5",
                        }}
                      >
                        {problem.description}
                      </p>

                      <p
                        style={{
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Time Limit: {problem.timeLimit}s
                        <br />
                        Memory Limit: {problem.memoryLimit} MB
                      </p>

                      <button
                        onClick={() => handleSelectProblem(problem)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "none",
                          borderRadius: "6px",
                          backgroundColor: "#2563eb",
                          color: "white",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        Solve Problem
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      );
    }

    if (currentPage === "leaderboard") {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#f5f7fa",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <nav
            style={{
              backgroundColor: "#1f2937",
              color: "white",
              padding: "15px 40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>CodeJudge</h2>

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </nav>

          <main
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              padding: "40px 20px",
            }}
          >
            <button
              onClick={() => setCurrentPage("dashboard")}
              style={{
                padding: "8px 14px",
                marginBottom: "25px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ← Dashboard
            </button>

            <div
              style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h1
                style={{
                  marginTop: 0,
                  color: "#111827",
                }}
              >
                🏆 Leaderboard
              </h1>

              <p
                style={{
                  color: "#6b7280",
                  marginBottom: "25px",
                }}
              >
                Ranking berdasarkan jumlah problem yang berhasil diselesaikan.
              </p>

              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Data diperbarui otomatis setiap 10 detik.
              </p>

              {isLoadingLeaderboard ? (
                <p
                  style={{
                    color: "#6b7280",
                  }}
                >
                  Loading leaderboard...
                </p>
              ) : leaderboard.length === 0 ? (
                <p
                  style={{
                    color: "#6b7280",
                  }}
                >
                  Belum ada data leaderboard.
                </p>
              ) : (
                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f9fafb",
                        }}
                      >
                        <th
                          style={{
                            padding: "15px",
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            color: "#374151",
                          }}
                        >
                          Rank
                        </th>

                        <th
                          style={{
                            padding: "15px",
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            color: "#374151",
                          }}
                        >
                          User
                        </th>

                        <th
                          style={{
                            padding: "15px",
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            color: "#374151",
                          }}
                        >
                          Solved
                        </th>

                        <th
                          style={{
                            padding: "15px",
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            color: "#374151",
                          }}
                        >
                          Accepted
                        </th>

                        <th
                          style={{
                            padding: "15px",
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            color: "#374151",
                          }}
                        >
                          Submissions
                        </th>

                        <th
                          style={{
                            padding: "15px",
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            color: "#374151",
                          }}
                        >
                          Accuracy
                        </th>

                        <th
                          style={{
                            padding: "15px",
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            color: "#374151",
                          }}
                        >
                          Score
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {leaderboard.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              padding: "50px 20px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <div
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  borderRadius: "50%",
                                  backgroundColor: "#f3f4f6",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  fontSize: "28px",
                                }}
                              >
                                🏆
                              </div>

                              <h3
                                style={{
                                  margin: "5px 0 0",
                                  color: "#111827",
                                }}
                              >
                                Belum Ada Data Leaderboard
                              </h3>

                              <p
                                style={{
                                  margin: 0,
                                  color: "#6b7280",
                                  maxWidth: "400px",
                                  lineHeight: "1.5",
                                }}
                              >
                                Belum ada user yang memiliki submission.
                                Selesaikan problem dan jadilah yang pertama
                                masuk leaderboard!
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        leaderboard.map((entry) => {
                          const isCurrentUser =
                            entry.userId === session?.user.id;

                          const isTopThree = entry.rank <= 3;

                          const getRankBackground = () => {
                            if (entry.rank === 1) {
                              return "#fef3c7";
                            }

                            if (entry.rank === 2) {
                              return "#f3f4f6";
                            }

                            if (entry.rank === 3) {
                              return "#ffedd5";
                            }

                            return "transparent";
                          };

                          const getRankColor = () => {
                            if (entry.rank === 1) {
                              return "#b45309";
                            }

                            if (entry.rank === 2) {
                              return "#4b5563";
                            }

                            if (entry.rank === 3) {
                              return "#c2410c";
                            }

                            return "#374151";
                          };

                          return (
                            <tr
                              key={entry.userId}
                              style={{
                                borderBottom: "1px solid #f3f4f6",
                                backgroundColor: isCurrentUser
                                  ? "#eff6ff"
                                  : getRankBackground(),
                                transition: "background-color 0.2s ease",
                              }}
                            >
                              <td
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  fontWeight: "bold",
                                  color: getRankColor(),
                                  fontSize: isTopThree ? "20px" : "16px",
                                }}
                              >
                                {entry.rank === 1
                                  ? "🥇"
                                  : entry.rank === 2
                                  ? "🥈"
                                  : entry.rank === 3
                                  ? "🥉"
                                  : entry.rank}
                              </td>

                              <td
                                style={{
                                  padding: "15px",
                                  color: "#111827",
                                  fontWeight: isCurrentUser
                                    ? "bold"
                                    : "normal",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  <span>{entry.name}</span>

                                  {isCurrentUser && (
                                    <span
                                      style={{
                                        padding: "3px 8px",
                                        borderRadius: "12px",
                                        backgroundColor: "#dbeafe",
                                        color: "#1d4ed8",
                                        fontSize: "11px",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      YOU
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  color: "#16a34a",
                                  fontWeight: "bold",
                                }}
                              >
                                {entry.solvedProblems}
                              </td>

                              <td
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  color: "#16a34a",
                                  fontWeight: "bold",
                                }}
                              >
                                {entry.acceptedSubmissions}
                              </td>

                              <td
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  color: "#6b7280",
                                }}
                              >
                                {entry.totalSubmissions}
                              </td>

                              <td
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  color: "#2563eb",
                                  fontWeight: "bold",
                                }}
                              >
                                {entry.accuracy}%
                              </td>

                              <td
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  color: "#f59e0b",
                                  fontWeight: "bold",
                                }}
                              >
                                {entry.score}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      );
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f5f7fa",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <nav
          style={{
            backgroundColor: "#1f2937",
            color: "white",
            padding: "15px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>CodeJudge</h2>

          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#ef4444",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Logout
          </button>
        </nav>

        <main
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "40px 20px",
          }}
        >
          <div style={{ marginBottom: "30px" }}>
            <h1
              style={{
                marginBottom: "10px",
                color: "#111827",
              }}
            >
              Welcome to CodeJudge! 👋
            </h1>

            <p
              style={{
                color: "#6b7280",
                fontSize: "16px",
              }}
            >
              Selamat datang, {session.user.name}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "25px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                }}
              >
                Total Soal
              </p>

              <h2
                style={{
                  margin: "10px 0 0",
                  color: "#2563eb",
                }}
              >
                {isLoadingDashboardStats
                  ? "..."
                  : dashboardStats.totalProblems}
              </h2>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "25px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                }}
              >
                Soal Diselesaikan
              </p>

              <h2
                style={{
                  margin: "10px 0 0",
                  color: "#16a34a",
                }}
              >
                {isLoadingDashboardStats
                  ? "..."
                  : dashboardStats.solvedProblems}
              </h2>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "25px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                }}
              >
                Total Submission
              </p>

              <h2
                style={{
                  margin: "10px 0 0",
                  color: "#9333ea",
                }}
              >
                {isLoadingDashboardStats
                  ? "..."
                  : dashboardStats.totalSubmissions}
              </h2>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "25px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                }}
              >
                Akurasi
              </p>

              <h2
                style={{
                  margin: "10px 0 0",
                  color: "#ea580c",
                }}
              >
                {isLoadingDashboardStats
                  ? "..."
                  : `${dashboardStats.accuracy}%`}
              </h2>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#111827",
              }}
            >
              Mulai Coding
            </h2>

            <p
              style={{
                color: "#6b7280",
                marginBottom: "25px",
              }}
            >
              Pilih aktivitas yang ingin kamu lakukan.
            </p>

            <div
              style={{
                display: "flex",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setCurrentPage("problems")}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                Lihat Daftar Soal
              </button>

              <button
                onClick={handleOpenSubmissionHistory}
                style={{
                  padding: "12px 24px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  color: "#374151",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                Riwayat Submission
              </button>

              <button
                onClick={handleOpenLeaderboard}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "#f59e0b",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                🏆 Leaderboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fa",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          width: "100%",
          maxWidth: "400px",
          padding: "35px",
          borderRadius: "10px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
            color: "#111827",
          }}
        >
          CodeJudge
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: "30px",
          }}
        >
          {isRegister ? "Buat akun baru" : "Masuk ke akun kamu"}
        </p>

        {isRegister && (
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "bold",
              }}
            >
              Nama
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama"
              style={{
                width: "100%",
                padding: "10px",
                boxSizing: "border-box",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Masukkan email"
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          />
        </div>

        <button
          onClick={isRegister ? handleRegister : handleLogin}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {isRegister ? "Daftar" : "Masuk"}
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#6b7280",
          }}
        >
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}
        </p>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setPassword("");
          }}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #2563eb",
            borderRadius: "6px",
            backgroundColor: "white",
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {isRegister ? "Kembali ke Login" : "Buat Akun Baru"}
        </button>
      </div>
    </div>
  );
}

export default App;