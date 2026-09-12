import { useState, useEffect, useRef } from "react";

export interface SubmissionResult {
  id: string;
  userId: string;
  problemId: string;
  language: string;
  status:
    | "PENDING"
    | "JUDGING"
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "COMPILATION_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "JUDGING_ERROR";
  runtime?: string | null;
  output?: string;
}

const FINAL_STATUSES = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILATION_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "JUDGING_ERROR",
];

export function useSubmissionStream(
  submissionId: string | null,
  backendUrl = "http://localhost:3000"
) {
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    if (!submissionId) {
      setSubmission(null);
      setIsStreaming(false);
      return;
    }

    isFinishedRef.current = false;
    setIsStreaming(true);
    setError(null);

    const eventSource = new EventSource(
      `${backendUrl}/api/submissions/${submissionId}/stream?_t=${Date.now()}`
    );

    const handleFinalStatus = (data: SubmissionResult) => {
      setSubmission(data);
      if (FINAL_STATUSES.includes(data.status)) {
        isFinishedRef.current = true;
        setIsStreaming(false);
        eventSource.close();
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SubmissionResult = JSON.parse(event.data);
        handleFinalStatus(data);
      } catch {
        setError("Gagal membaca stream");
      }
    };

    eventSource.onerror = () => {
      if (!isFinishedRef.current) {
        eventSource.close();
      }
    };

    const fallbackInterval = setInterval(async () => {
      if (isFinishedRef.current) {
        clearInterval(fallbackInterval);
        return;
      }

      try {
        const res = await fetch(
          `${backendUrl}/api/submissions/${submissionId}?_t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
        );

        if (res.ok) {
          const json = await res.json();
          if (json.submission) {
            handleFinalStatus(json.submission);
          }
        }
      } catch {
        setError("Gagal mengambil status terbaru");
      }
    }, 800);

    return () => {
      isFinishedRef.current = true;
      eventSource.close();
      clearInterval(fallbackInterval);
      setIsStreaming(false);
    };
  }, [submissionId, backendUrl]);

  return { submission, isStreaming, error };
}