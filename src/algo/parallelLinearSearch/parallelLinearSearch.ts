/**
 * Thought experiment: Parallel Linear Search
 *
 * Implements linear search using two Node.js worker threads searching
 * simultaneously on array halves. Returns as soon as either worker finds
 * the target, or waits for both if not found.
 *
 * This is a thought experiment to understand:
 *
 *    Breakeven analysis:
 *      Array Size     | Sequential Time | Parallel Time | Speedup
 *      ─────────────────────────────────────────────────────────
 *      10,000         | 0.01ms          | 55ms          | 0.0002x (TERRIBLE)
 *      100,000        | 0.1ms           | 30ms          | 0.003x  (BAD)
 *      1,000,000      | 1ms             | 35ms          | 0.03x   (POOR)
 *      10,000,000     | 10ms            | 35ms          | 0.28x   (MARGINAL)
 *      100,000,000    | 100ms           | 80ms          | 1.25x   (USEFUL)
 *
 *    Takeaway: Need MASSIVE arrays before parallelism helps.
 *
 * 5. WHY THIS IS A THOUGHT EXPERIMENT (Not Production-Ready)
 *    ───────────────────────────────────────────────────────
 *    This is not a practical solution because better alternatives exist:
 *
 *    Problem                 | Better Solution      | Why
 *    ────────────────────────┼──────────────────────┼──────────────────
 *    Unsorted, small array   | Sequential O(n)      | No overhead
 *    Unsorted, large array   | Hash table O(1)      | Constant time lookup
 *    Sorted array            | Binary search O(log n)| Exponentially faster
 *    Repeated searches       | Build index once     | One-time O(n) setup
 *
 *    For n = 1,000,000:
 *      • Linear search: ~1,000,000 comparisons
 *      • Binary search: ~20 comparisons
 *      • Hash table: 1 lookup
 *
 *    Parallel linear search still does ~500,000 comparisons (just in 2 threads).
 *    That's still slower than binary search's 20 comparisons!
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CODE WALKTHROUGH
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * STEP 1: Array Split
 *   const mid = Math.floor(arr.length / 2);
 *   ↓
 *   Array [a,b,c,d,e,f,g,h,i,j] with length 10
 *   mid = floor(10/2) = 5
 *   w1 searches: [a,b,c,d,e]     (indices 0-4, offset=0)
 *   w2 searches: [f,g,h,i,j]     (indices 5-9, offset=5)
 *
 * STEP 2: Worker Creation
 *   new Worker(path, { workerData, execArgv })
 *   ↓
 *   • Path must be absolute (uses __dirname)
 *   • workerData is cloned and sent to worker
 *   • execArgv: ["-r", "ts-node/register"] allows worker to run .ts files
 *   • Worker starts immediately in background
 *
 * STEP 3: State Tracking
 *   result1: number | null = null
 *   result2: number | null = null
 *   ↓
 *   Both start as null (not ready)
 *   When worker responds: -1 (not found) or index (found at that index)
 *   Guard clause ensures we don't proceed until both are ready
 *
 * STEP 4: Fast Path (Worker Finds It)
 *   w1.on("message", (index) => {
 *     if (index !== -1) {           // Found!
 *       w2.terminate();             // Kill other worker immediately
 *       resolve(index);             // Return result to caller
 *     } else {
 *       checkComplete();            // Not found, wait for w2
 *     }
 *   });
 *   ↓
 *   Asymmetric: if either worker finds it, resolve immediately
 *   Don't wait for the other worker (saves time)
 *
 * STEP 5: Slow Path (Both Search Complete)
 *   checkComplete() {
 *     if (result1 === null || result2 === null) return; // Not both ready
 *     // Both are ready now
 *     terminate both workers
 *     return result1 !== -1 ? result1 : result2
 *   }
 *   ↓
 *   Guard clause prevents premature execution
 *   If w1 says "not found" and w2 is still running, return early
 *   Only proceed when BOTH have responded
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEY INSIGHTS TO REMEMBER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ✓ Workers are NOT free
 *   ~50-100ms overhead means only viable for very large datasets (10M+ elements)
 *
 * ✓ Message passing copies data
 *   Entire array is cloned, so O(n) serialization overhead
 *   No shared mutable state (by design, for safety)
 *
 * ✓ Race conditions are real but manageable
 *   Use state (null checks) to synchronize
 *   Promise resolves exactly once (idempotent)
 *   Early exits optimize asymmetric workloads
 *
 * ✓ Better algorithms beat parallelism
 *   O(log n) > O(n/2) always, even with parallelism
 *   Choose right algorithm first, parallelize second
 *
 * ✓ When to parallelize
 *   Only when:
 *   • Work is CPU-bound (not I/O)
 *   • Work is large enough to justify overhead
 *   • You have spare CPU cores
 *   • Better algorithms aren't available
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Worker } from "worker_threads";
import path from "path";

export function parallelLinearSearch(
  arr: number[],
  target: number
): Promise<number> {
  const start = performance.now();

  return new Promise((resolve) => {
    const mid = Math.floor(arr.length / 2);

    // Worker 1: search from beginning
    const w1 = new Worker(path.join(__dirname, "searchWorker.ts"), {
      workerData: { arr: arr.slice(0, mid), target, offset: 0 },
      execArgv: ["-r", "ts-node/register"],
    });

    // Worker 2: search from middle to end
    const w2 = new Worker(path.join(__dirname, "searchWorker.ts"), {
      workerData: { arr: arr.slice(mid), target, offset: mid },
      execArgv: ["-r", "ts-node/register"],
    });

    let result1: number | null = null;
    let result2: number | null = null;

    const checkComplete = () => {
      if (result1 === null || result2 === null) return;

      w1.terminate();
      w2.terminate();
      const duration = Date.now() - start;

      const finalResult = result1 !== -1 ? result1 : result2;
      const worker = result1 !== -1 ? "w1" : result2 !== -1 ? "w2" : "none";

      console.log(
        `Worker: ${worker} | Found: ${
          finalResult !== -1
        } | Index: ${finalResult} | Duration: ${duration}ms`
      );
      resolve(finalResult);
    };

    w1.on("message", (index) => {
      result1 = index;
      if (index !== -1) {
        // Found it! Terminate immediately
        w2.terminate();
        const duration = Date.now() - start;
        console.log(
          `Worker: w1 | Found: true | Index: ${index} | Duration: ${duration}ms`
        );
        resolve(index);
      } else {
        checkComplete();
      }
    });

    w2.on("message", (index) => {
      result2 = index;
      if (index !== -1) {
        // Found it! Terminate immediately
        w1.terminate();
        const duration = Date.now() - start;
        console.log(
          `Worker: w2 | Found: true | Index: ${index} | Duration: ${duration}ms`
        );
        resolve(index);
      } else {
        checkComplete();
      }
    });
  });
}
