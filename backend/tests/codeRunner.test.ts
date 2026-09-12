import { describe, expect, test } from "vitest";
import { runCppCode, runPythonCode, runJsCode, executeSubmission } from "../src/codeRunner.js";

const CODE_CPP_ACCEPTED = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << a + b;
    }
    return 0;
}
`;

const CODE_CPP_WRONG = `
#include <iostream>
using namespace std;
int main() {
    cout << "99999";
    return 0;
}
`;

const CODE_CPP_SYNTAX_ERROR = `
#include <iostream>
using namespace std;
int main() {
    cout << "Kurang titik koma"
    return 0;
}
`;

const CODE_CPP_RUNTIME_ERROR = `
#include <iostream>
using namespace std;
int main() {
    return 1; // Non-zero exit code
}
`;

const CODE_CPP_TLE = `
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;
int main() {
    this_thread::sleep_for(chrono::seconds(6));
    return 0;
}
`;

const CODE_CPP_OUTPUT_LIMIT = `
#include <iostream>
using namespace std;
int main() {
    for (int i = 0; i < 10000; i++) {
        cout << "Output terlalu panjang sampai melebihi batas maksimal 10KB" << endl;
    }
    return 0;
}
`;

const CODE_PYTHON_ACCEPTED = `
import sys
input_data = sys.stdin.read().split()
if len(input_data) >= 2:
    a, b = map(int, input_data[:2])
    print(a + b)
`;

const CODE_PYTHON_WRONG = `
print("99999")
`;

const CODE_JS_ACCEPTED = `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2) {
    const a = Number(input[0]);
    const b = Number(input[1]);
    console.log(a + b);
}
`;

const CODE_JS_WRONG = `
console.log("99999");
`;

describe("CodeRunner Unit Tests - g++ Execution Engine", () => {
  test("harus mengembalikan ACCEPTED jika output sesuai", async () => {
    const result = await runCppCode(CODE_CPP_ACCEPTED, "5 10", "15");
    expect(result.status).toBe("ACCEPTED");
    expect(result.output).toBe("15");
  });

  test("harus mengembalikan WRONG_ANSWER jika output tidak sesuai", async () => {
    const result = await runCppCode(CODE_CPP_WRONG, "5 10", "15");
    expect(result.status).toBe("WRONG_ANSWER");
  });

  test("harus mengembalikan COMPILATION_ERROR jika sintaks C++ salah", async () => {
    const result = await runCppCode(CODE_CPP_SYNTAX_ERROR, "5 10", "15");
    expect(result.status).toBe("COMPILATION_ERROR");
  });

  test("harus mengembalikan RUNTIME_ERROR jika program crash atau non-zero exit", async () => {
    const result = await runCppCode(CODE_CPP_RUNTIME_ERROR, "", "0");
    expect(result.status).toBe("RUNTIME_ERROR");
  });

  test("harus mengembalikan TIME_LIMIT_EXCEEDED jika eksekusi melebihi 5 detik", async () => {
    const result = await runCppCode(CODE_CPP_TLE, "", "0");
    expect(result.status).toBe("TIME_LIMIT_EXCEEDED");
  }, 10000);

  test("harus mengembalikan RUNTIME_ERROR jika output melebihi batas 10 KB", async () => {
    const result = await runCppCode(CODE_CPP_OUTPUT_LIMIT, "", "0");
    expect(result.status).toBe("RUNTIME_ERROR");
  });
});

describe("CodeRunner Unit Tests - Python Execution Engine", () => {
  test("harus mengembalikan ACCEPTED untuk kode Python yang benar", async () => {
    const result = await runPythonCode(CODE_PYTHON_ACCEPTED, "5 10", "15");
    expect(result.status).toBe("ACCEPTED");
    expect(result.output).toBe("15");
  });

  test("harus mengembalikan WRONG_ANSWER untuk kode Python yang salah output", async () => {
    const result = await runPythonCode(CODE_PYTHON_WRONG, "5 10", "15");
    expect(result.status).toBe("WRONG_ANSWER");
  });
});

describe("CodeRunner Unit Tests - JavaScript (Node.js) Execution Engine", () => {
  test("harus mengembalikan ACCEPTED untuk kode JavaScript yang benar", async () => {
    const result = await runJsCode(CODE_JS_ACCEPTED, "5 10", "15");
    expect(result.status).toBe("ACCEPTED");
    expect(result.output).toBe("15");
  });

  test("harus mengembalikan WRONG_ANSWER untuk kode JavaScript yang salah output", async () => {
    const result = await runJsCode(CODE_JS_WRONG, "5 10", "15");
    expect(result.status).toBe("WRONG_ANSWER");
  });
});

describe("CodeRunner Dispatcher - executeSubmission", () => {
  test("harus mengarahkan eksekusi ke runner yang tepat sesuai bahasa", async () => {
    const pyResult = await executeSubmission("python", CODE_PYTHON_ACCEPTED, "7 8", "15");
    expect(pyResult.status).toBe("ACCEPTED");

    const jsResult = await executeSubmission("javascript", CODE_JS_ACCEPTED, "10 20", "30");
    expect(jsResult.status).toBe("ACCEPTED");
  });

  test("harus mengembalikan COMPILATION_ERROR jika bahasa tidak dikenali", async () => {
    const result = await executeSubmission("golang", "package main...", "1 2", "3");
    expect(result.status).toBe("COMPILATION_ERROR");
    expect(result.output).toContain("not supported");
  });
});