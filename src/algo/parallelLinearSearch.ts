import { Worker } from "worker_threads";
import path from "path";
import { performance } from "perf_hooks";

// TODO: compare timings with normal linearSearch and parallel linearSearch
/**
 *
 * @param arr incoming arr; can be of any type
 * @param target element to be found
 * @returns array index or -1 if not found
 */
export async function parallelLinearSearch<T>(
  arr: T[],
  target: T
): Promise<number> {
  if (arr.length === 0) return -1;
  // For small arrays, worker overhead isn’t worth it.
  if (arr.length < 10_000) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === target) {
        console.log(`[parallelLinearSearch] small-array found=true index=${i}`);
        return i;
      }
    }
    console.log(`[parallelLinearSearch] small-array found=false`);
    return -1;
  }

  const mid = Math.floor((arr.length - 1) / 2);
  const workerPath = path.resolve(__dirname, "parallelSearchWorker.js"); // compiled output path

  return await new Promise<number>((resolve) => {
    const w1 = new Worker(workerPath, {
      workerData: { arr, target, start: 0, end: mid, step: 1 },
    });
    const w2 = new Worker(workerPath, {
      workerData: {
        arr,
        target,
        start: arr.length - 1,
        end: mid + 1,
        step: -1,
      },
    });

    let settled = false;
    let foundBy: "w1" | "w2" | null = null;
    const finish = (result: number) => {
      if (settled) return;
      settled = true;
      w1.terminate();
      w2.terminate();
      console.log(
        `[parallelLinearSearch] finish result=${result} foundBy=${
          foundBy ?? "none"
        }`
      );
      resolve(result);
    };

    const handler =
      (workerId: "w1" | "w2") => (msg: { found: boolean; index: number }) => {
        console.log(
          `[parallelLinearSearch] ${workerId} found=${msg.found} index=${msg.index}`
        );
        if (msg.found) {
          foundBy = workerId;
          finish(msg.index);
        } else if (workerId === "w1") {
          // wait for w2
        } else {
          // both failed
          finish(-1);
        }
      };

    w1.on("message", handler("w1"));
    w2.on("message", handler("w2"));
    w1.on("error", (err) => {
      console.error(`[parallelLinearSearch] w1 error`, err);
      finish(-1);
    });
    w2.on("error", (err) => {
      console.error(`[parallelLinearSearch] w2 error`, err);
      finish(-1);
    });
  });
}

export async function parallelLinearSearchWithTiming<T>(
  arr: T[],
  target: T
): Promise<{ index: number; durationMs: number }> {
  const start = performance.now();
  const index = await parallelLinearSearch(arr, target);
  const durationMs = performance.now() - start;
  console.log(
    `[parallelLinearSearchWithTiming] index=${index} durationMs=${durationMs.toFixed(
      3
    )}ms`
  );
  return { index, durationMs };
}
