import { parallelLinearSearchWithTiming } from "./algo/parallelLinearSearch";

async function main() {
  const size = 50_000;
  const arr = Array.from({ length: size }, () =>
    Math.floor(Math.random() * 1_000_000)
  );
  // ensure the target exists near the end so work is non-trivial
  const target = 999_991;
  const targetPos = size - 123; // put it near the right side
  arr[targetPos] = target;

  const { index, durationMs } = await parallelLinearSearchWithTiming(
    arr,
    target
  );
  console.log({
    expected: targetPos,
    found: index,
    durationMs: `${durationMs.toFixed(3)} ms`,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
