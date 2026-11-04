import { extractProductCode } from "./order-parser.js";

const tests = [
  { message: "#A1", expected: "A1" },
  { message: "Je prends #A1", expected: "A1" },
  { message: "Jp A1", expected: "A1" },
  { message: "Bonjour tout le monde", expected: null },
];

for (const test of tests) {
  const result = extractProductCode(test.message);

  console.log({
    message: test.message,
    expected: test.expected,
    result,
    passed: result === test.expected,
  });
}