import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { useSubmissionStream } from "../hooks/useSubmissionStream";

const DEFAULT_CODE: Record<string, string> = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << a + b;
    }
    return 0;
}`,
  python: `import sys
input_data = sys.stdin.read().split()
if len(input_data) >= 2:
    a, b = map(int, input_data[:2])
    print(a + b)`,
  javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2) {
    console.log(Number(input[0]) + Number(input[1]));
}`,
};

interface Props {
  problemId: string;
  userId: string;
  backendUrl?: string;
}

export const CodeJudgeEditor: React.FC<Props> = ({
  problemId,
  userId,
  backendUrl = "http://localhost:3000",
}) => {
  const [language, setLanguage] = useState<"cpp" | "python" | "javascript">(
    "cpp"
  );
  const [sourceCode, setSourceCode] = useState(DEFAULT_CODE.cpp);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gunakan Custom Hook SSE untuk stream status
  const { submission, isStreaming } = useSubmissionStream(
    activeSubmissionId,
    backendUrl
  );

  const handleLanguageChange = (newLang: "cpp" | "python" | "javascript") => {
    setLanguage(newLang);
    setSourceCode(DEFAULT_CODE[newLang]);
    setActiveSubmissionId(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setActiveSubmissionId(null);

    try {
      const res = await fetch(`${backendUrl}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          problemId,
          language,
          sourceCode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.submission?.id) {
        // Pancing rute SSE untuk mulai mendengarkan event background judging
        setActiveSubmissionId(data.submission.id);
      } else {
        alert(data.message || "Gagal membuat submission");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Gagal terhubung ke server backend (port 3000)");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeColor = (status?: string) => {
    switch (status) {
      case "ACCEPTED":
        return "#10B981"; // Hijau
      case "WRONG_ANSWER":
      case "RUNTIME_ERROR":
      case "COMPILATION_ERROR":
      case "TIME_LIMIT_EXCEEDED":
        return "#EF4444"; // Merah
      case "JUDGING":
      case "PENDING":
        return "#F59E0B"; // Orange
      default:
        return "#6B7280"; // Abu-abu
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "850px",
        margin: "0 auto",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as any)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            fontWeight: "bold",
            backgroundColor: "#1F2937",
            color: "white",
            border: "1px solid #374151",
          }}
        >
          <option value="cpp">C++ (g++)</option>
          <option value="python">Python 3</option>
          <option value="javascript">JavaScript (Node.js)</option>
        </select>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isStreaming}
          style={{
            padding: "10px 24px",
            backgroundColor: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isSubmitting || isStreaming ? "not-allowed" : "pointer",
            fontWeight: "bold",
            opacity: isSubmitting || isStreaming ? 0.7 : 1,
          }}
        >
          {isSubmitting || isStreaming ? "Judging..." : "Submit Code 🚀"}
        </button>
      </div>

      {/* Editor Monaco */}
      <div
        style={{
          border: "1px solid #374151",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Editor
          height="380px"
          language={language === "cpp" ? "cpp" : language}
          theme="vs-dark"
          value={sourceCode}
          onChange={(val) => setSourceCode(val || "")}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {/* Real-time Status Card */}
      {submission && (
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "#1F2937",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
              Submission Result (SSE Stream):
            </span>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: getBadgeColor(submission.status),
                marginTop: "4px",
              }}
            >
              {submission.status}
              {isStreaming && " (Evaluating...)"}
            </div>
          </div>

          {submission.runtime && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
                Execution Time:
              </span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginTop: "4px",
                }}
              >
                {submission.runtime} ms
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};