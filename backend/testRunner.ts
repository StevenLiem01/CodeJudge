import { runCppCode } from "./src/codeRunner.js";

const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;

    cout << a + b;

    return 0;
}
`;

const result = await runCppCode(
  sourceCode,
  "5 10",
  "15"
);

console.log(result);