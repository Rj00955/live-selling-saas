import { classifyComment } from "./order-parser.js";

const tests = [
  { message: "#A1", expected: "UNCLEAR" },
  { message: "Je prends #A1", expected: "PURCHASE" },
  { message: "Jp A1", expected: "PURCHASE" },
  { message: "Bonjour tout le monde", expected: "UNCLEAR" },
  { message: "Ohatrinona A1 ?", expected: "PRICE" },
  { message: "Mbola misy A1 ve ?", expected: "AVAILABILITY" },
  { message: "Maka 2 #A1", expected: "PURCHASE" },
  { message: "Tsara be ❤️", expected: "REACTION" },
];

let failed = 0;

for (const test of tests) {
  const result = classifyComment(test.message);
  const passed = result.intent === test.expected;

  if (!passed) failed++;

  console.log({
    message: test.message,
    expected: test.expected,
    result: result.intent,
    quantity: result.quantity,
    passed,
  });
}

console.log(`\nRésultat : ${tests.length - failed}/${tests.length} tests réussis.`);