# Parallel Linear Search: Complete Explanation from First Principles

## Table of Contents

1. What is Linear Search?
2. The Problem with Sequential Search
3. What is Parallelism?
4. Node.js Worker Threads
5. The Parallel Search Strategy
6. Code Walkthrough
7. Race Conditions and Synchronization
8. Performance Characteristics
9. Trade-offs and When to Use

---

## What is Linear Search? {#what-is-linear-search}

### The Fundamental Concept

**Linear search** is the simplest search algorithm. It answers one question: "Is this value in this collection?"

**How it works:**

1. Start at the first element (index 0)
2. Check if current element equals target
3. If yes → return the index
4. If no → move to next element
5. Repeat until found or reach the end
6. If reached end without finding → return -1 (not found)

### Example

Searching for `7` in array `[3, 1, 7, 9, 2]`:

```
Step 1: Check index 0 → arr[0] = 3 ≠ 7, continue
Step 2: Check index 1 → arr[1] = 1 ≠ 7, continue
Step 3: Check index 2 → arr[2] = 7 = 7, FOUND! Return 2
```

Searching for `5` in same array:

```
Step 1: arr[0] = 3 ≠ 5
Step 2: arr[1] = 1 ≠ 5
Step 3: arr[2] = 7 ≠ 5
Step 4: arr[3] = 9 ≠ 5
Step 5: arr[4] = 2 ≠ 5
Step 6: Reached end, return -1 (not found)
```

### Time Complexity Analysis

- **Best case**: O(1) - target is at index 0
- **Worst case**: O(n) - target is at the last index or not present
- **Average case**: O(n/2) = O(n) - on average, we check half the array

Where `n` is the number of elements in the array.

**Why O(n)?** Because in the worst case, we must examine every single element once. The time grows linearly with array size.

---

## The Problem with Sequential Search {#the-problem}

### The Bottleneck

Sequential linear search has a fundamental limitation: **it's single-threaded**. Even on a machine with 8 CPU cores, only ONE core does the work while the other 7 sit idle.

**Real-world analogy:**
Imagine searching for a specific book in a library with 100,000 books:

- **Sequential approach**: One person walks shelf by shelf, book by book
- **Parallel approach**: 10 people each search 10,000 books simultaneously

### Why Can't We Just "Speed Up" a Single Thread?

Modern CPUs have hit physical limits:

1. **Clock speed plateau**: CPUs haven't gotten much faster since ~2005 (around 3-4 GHz)
2. **Power/heat constraints**: Higher frequencies generate exponentially more heat
3. **Physics**: Speed of light limits how fast electrons can move

**The industry solution**: Add more cores instead of making single cores faster.

### The Opportunity

If we can split the search work across multiple cores, we can theoretically search faster. This is where **parallelism** comes in.

---

## What is Parallelism? {#what-is-parallelism}

### Core Concepts

**Parallelism** means doing multiple things _truly simultaneously_ using multiple execution units (CPU cores).

**Contrast with Concurrency:**

- **Concurrency**: Task-switching on a single core (looks parallel, but isn't)
- **Parallelism**: Actually running on separate cores at the exact same time

**Visual representation:**

```
Sequential (1 core):
Core 1: [Task A][Task B][Task C][Task D]
Time:   0----1----2----3----4

Parallel (4 cores):
Core 1: [Task A]
Core 2: [Task B]
Core 3: [Task C]
Core 4: [Task D]
Time:   0----1
```

### Amdahl's Law: The Theoretical Limit

**Amdahl's Law** states that speedup from parallelism is limited by the sequential portion of your algorithm.

**Formula:**

```
Speedup = 1 / ((1 - P) + (P / N))

Where:
P = portion of algorithm that can be parallelized (0 to 1)
N = number of processors
```

**For linear search:**

- P ≈ 1.0 (almost 100% can be parallelized)
- With 2 workers: Max speedup = 1 / (0 + 1/2) = 2x

**However**, this is theoretical. In practice, we have overhead:

- Worker creation time (~10-50ms)
- Data serialization/copying
- Result collection
- Thread scheduling

---

## Node.js Worker Threads {#worker-threads}

### JavaScript's Single-Threaded Nature

**JavaScript runs on a single thread by design:**

- The **Event Loop** handles async operations
- This prevents race conditions and simplifies programming
- But it means CPU-intensive tasks block everything

```javascript
// This blocks the entire program for 5 seconds
function blockingTask() {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    // Busy wait
  }
}

blockingTask(); // Nothing else can run during this
console.log("Finally done!"); // This waits 5 seconds
```

### Enter Worker Threads

**Worker Threads** (introduced in Node.js v10.5.0) allow true parallelism in Node:

```
Main Thread                Worker Thread 1         Worker Thread 2
    |                            |                       |
    |-- Create worker 1 -------->|                       |
    |-- Create worker 2 ---------------------->          |
    |                            |                       |
    |                       [Processing]            [Processing]
    |                            |                       |
    |<--- Result message --------                        |
    |<--- Result message ------------------------------ |
    |                            |                       |
   Done                      Terminated              Terminated
```

### How Worker Threads Work

**1. Separate V8 Instances:**
Each worker runs in its own V8 isolate (separate JavaScript runtime):

- Own memory heap
- Own event loop
- Own global scope
- Cannot directly access main thread variables

**2. Communication via Message Passing:**
Workers and main thread communicate by sending serialized messages:

```javascript
// Main thread
const worker = new Worker("./worker.js", {
  workerData: { foo: "bar" }, // Serialized and copied
});

worker.on("message", (msg) => {
  console.log(msg); // Received from worker
});

// worker.js
const { parentPort, workerData } = require("worker_threads");
console.log(workerData.foo); // 'bar'
parentPort.postMessage({ result: 42 }); // Send back
```

**3. Data Serialization:**

- Data is **copied**, not shared (by default)
- Uses [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
- Cannot send functions, symbols, etc.
- Can use `SharedArrayBuffer` for shared memory (advanced)

**4. Lifecycle:**

```
1. new Worker() → Worker spawned, separate process
2. Worker executes its script
3. Worker sends messages via parentPort.postMessage()
4. Main listens via worker.on('message', ...)
5. worker.terminate() → Worker killed
```

### The Cost of Workers

**Overhead includes:**

1. **Spawn time**: ~10-50ms to create a new worker
2. **Memory**: Each worker ~10-30MB baseline
3. **Serialization**: Data must be cloned/copied
4. **IPC (Inter-Process Communication)**: Message passing has latency

**Rule of thumb:** Workers only make sense when task duration > overhead

---

## The Parallel Search Strategy {#the-strategy}

### Divide and Conquer Approach

Our strategy splits the array into two halves and searches both simultaneously:

```
Original array (length 10):
[3, 7, 2, 9, 1, 5, 8, 4, 6, 0]
 0  1  2  3  4  5  6  7  8  9  ← indices

Split at mid = floor(10/2) = 5:

Worker 1 searches:        Worker 2 searches:
[3, 7, 2, 9, 1]          [5, 8, 4, 6, 0]
 0  1  2  3  4            5  6  7  8  9
```

### Why This Works

**Key insight**: If the target is in the first half, Worker 1 finds it while Worker 2 is still searching. If in second half, Worker 2 finds it.

**Expected speedup scenarios:**

1. **Target in first quarter**: Worker 1 finds it after checking ~25% of array

   - Sequential: Would need to check 25%
   - Parallel: Same time, but Worker 2 wasted effort
   - **No speedup** (but also no slowdown if overhead is small)

2. **Target in middle**: Found around when workers meet

   - Sequential: Check 50%
   - Parallel: Both check 25% simultaneously
   - **~2x speedup**

3. **Target not present**: Must check entire array
   - Sequential: Check 100%
   - Parallel: Each checks 50% simultaneously
   - **~2x speedup**

### Alternative Strategies (Not Used Here)

**1. More than 2 workers:**

```
4 workers, array of 100 elements:
Worker 1: [0-24]
Worker 2: [25-49]
Worker 3: [50-74]
Worker 4: [75-99]
```

Theoretical 4x speedup, but:

- 4x the overhead
- Diminishing returns (Amdahl's Law)
- Most machines have 4-16 cores

**2. Work stealing:**

- Workers dynamically grab chunks from a queue
- Better load balancing
- More complex coordination

**3. Search from both ends:**

```
Worker 1: Start at 0, go forward →
Worker 2: Start at end, go backward ←
```

Useful if target is likely near start OR end

We use the simple **split-in-half** approach for clarity.

---

## Code Walkthrough {#code-walkthrough}

Let's dissect every line of parallelLinearSearch.ts:

### Function Signature

```typescript
export function parallelLinearSearch(
  arr: number[],
  target: number
): Promise<number>;
```

**Why Promise?**

- Worker operations are **asynchronous**
- Creating workers and waiting for results is non-blocking
- Promises represent "a value that will be available in the future"

**Return type `number`:**

- Returns index if found (0 or positive)
- Returns -1 if not found (convention from `Array.indexOf`)

### Setup Phase

```typescript
const start = Date.now();
```

**Captures start time** for duration calculation.

- `Date.now()` returns milliseconds since Unix epoch (Jan 1, 1970)
- Not high-precision, but sufficient for benchmarking (±1-10ms accuracy)
- For microsecond precision, use `performance.now()`

```typescript
return new Promise((resolve) => {
```

**Creates a Promise:**

- `resolve` is a function we'll call when search completes
- Calling `resolve(value)` fulfills the promise with that value
- The caller can `await` or `.then()` this promise

### Array Splitting

```typescript
const mid = Math.floor(arr.length / 2);
```

**Calculates midpoint:**

- `Math.floor` rounds down to nearest integer
- Examples:
  - Array length 10: mid = 5 (splits [0-4] and [5-9])
  - Array length 11: mid = 5 (splits [0-4] and [5-10])
  - Array length 1: mid = 0 (splits [] and [0])

### Worker 1 Creation

```typescript
const w1 = new Worker(path.join(__dirname, "searchWorker.ts"), {
  workerData: { arr: arr.slice(0, mid), target, offset: 0 },
  execArgv: ["-r", "ts-node/register"],
});
```

**Breaking this down:**

**1. `path.join(__dirname, "searchWorker.ts")`:**

- `__dirname` is current directory (e.g., algo)
- `path.join` creates absolute path: searchWorker.ts
- Worker needs absolute path to find the file

**2. `workerData` object:**
This data is serialized and sent to the worker:

```typescript
{
  arr: arr.slice(0, mid),  // First half of array
  target,                   // Shorthand for target: target
  offset: 0                 // Worker 1 starts at index 0
}
```

**Why `arr.slice(0, mid)`?**

- `slice(start, end)` creates a **new array** with elements from `start` to `end-1`
- For array `[a, b, c, d, e]` with mid=2: `slice(0, 2)` → `[a, b]`
- This is a **copy**, not a reference (important for message passing)

**Why `offset: 0`?**

- Worker 1's indices are relative (0, 1, 2...)
- But we need to report **absolute** indices in the original array
- `offset` converts: `absolute_index = worker_index + offset`

**3. `execArgv: ["-r", "ts-node/register"]`:**

- Tells Node.js to load `ts-node/register` before executing worker
- This enables the worker to run `.ts` files directly
- Without this, worker would expect `.js` files

**The Worker Creation Process:**

```
1. Node spawns new process
2. New V8 isolate is created
3. ts-node registers TypeScript loader
4. searchWorker.ts is loaded and executed
5. workerData is serialized and copied to worker
6. Worker starts running
```

### Worker 2 Creation

```typescript
const w2 = new Worker(path.join(__dirname, "searchWorker.ts"), {
  workerData: { arr: arr.slice(mid), target, offset: mid },
  execArgv: ["-r", "ts-node/register"],
});
```

**Differences from Worker 1:**

**1. `arr: arr.slice(mid)`:**

- `slice(mid)` with no second argument means "from `mid` to end"
- For array `[a, b, c, d, e]` with mid=2: `slice(2)` → `[c, d, e]`

**2. `offset: mid`:**

- Worker 2's local index 0 corresponds to original array's index `mid`
- Example: If worker 2 finds target at its index 3, absolute index = 3 + mid

### Result Tracking Variables

```typescript
let result1: number | null = null;
let result2: number | null = null;
```

**Why `null`?**

- We need three states: "not ready", "found", "not found"
- `-1` means "searched and not found"
- `null` means "haven't received result yet"
- A positive number means "found at this index"

**Type annotation `number | null`:**

- TypeScript union type
- Value can be either a number or null
- Provides type safety

### Completion Check Function

```typescript
const checkComplete = () => {
  if (result1 === null || result2 === null) return;
```

**First guard clause:**

- If either result is still `null`, we're not done
- Early return prevents rest of function from running
- This is called a **guard clause** or **early exit pattern**

```typescript
w1.terminate();
w2.terminate();
```

**Cleanup workers:**

- `terminate()` immediately kills the worker
- Frees memory (~10-30MB per worker)
- Prevents workers from continuing to run

**Important**: We only reach here when BOTH workers have responded

```typescript
const duration = Date.now() - start;
```

**Calculate elapsed time:**

- Current time minus start time = duration
- Result is in milliseconds

```typescript
const finalResult = result1 !== -1 ? result1 : result2;
```

**Ternary operator breakdown:**

- `condition ? valueIfTrue : valueIfFalse`
- "If result1 is not -1 (found), use result1, else use result2"

**Logic table:**

```
result1 | result2 | finalResult | Meaning
--------|---------|-------------|------------------
   5    |   -1    |      5      | Worker 1 found it
  -1    |    8    |      8      | Worker 2 found it
  -1    |   -1    |     -1      | Not found
   3    |    7    |      3      | Both found (impossible in correct code)
```

```typescript
const worker = result1 !== -1 ? "w1" : result2 !== -1 ? "w2" : "none";
```

**Nested ternary (chained conditions):**

```
result1 !== -1 ? "w1"              // If w1 found it
               : result2 !== -1 ? "w2"    // Else if w2 found it
                                : "none"  // Else neither found it
```

```typescript
console.log(
  `Worker: ${worker} | Found: ${
    finalResult !== -1
  } | Index: ${finalResult} | Duration: ${duration}ms`
);
resolve(finalResult);
```

**Logging and resolution:**

- Template literals (`${...}`) embed values in string
- `finalResult !== -1` is a boolean (true/false)
- `resolve(finalResult)` fulfills the Promise, returning to caller

### Worker 1 Message Handler

```typescript
w1.on("message", (index) => {
  result1 = index;
```

**Event listener:**

- `on("message", callback)` registers callback for message events
- Worker sends message via `parentPort.postMessage(value)`
- `index` is the value sent by worker (number)

**Store result:**

- Save worker's result in `result1`
- Now `result1` is no longer `null`

```typescript
  if (index !== -1) {
    w2.terminate();
```

**Early termination optimization:**

- If worker 1 found the target (`index !== -1`)
- We don't need worker 2 anymore
- Kill it immediately to save CPU cycles

```typescript
const duration = Date.now() - start;
console.log(
  `Worker: w1 | Found: true | Index: ${index} | Duration: ${duration}ms`
);
resolve(index);
```

**Fast path logging and resolution:**

- Calculate duration
- Log that w1 found it
- Immediately resolve Promise (don't wait for `checkComplete`)

**Why separate from `checkComplete`?**

- **Performance**: If w1 finds it in first millisecond, why wait for w2?
- **Responsiveness**: Caller gets result as soon as any worker succeeds

```typescript
  } else {
    checkComplete();
  }
});
```

**No-find path:**

- If worker 1 didn't find it (`index === -1`)
- Call `checkComplete()` to see if worker 2 is also done
- If w2 is still running (`result2 === null`), `checkComplete` returns early
- If w2 is done, `checkComplete` resolves with final result

### Worker 2 Message Handler

```typescript
w2.on("message", (index) => {
  result2 = index;
  if (index !== -1) {
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
```

**Identical logic to Worker 1:**

- Store result in `result2`
- If found, kill w1 and resolve immediately
- If not found, check if both are complete

**Symmetry is intentional:**

- Either worker can finish first
- Both follow same pattern

---

## Race Conditions and Synchronization {#race-conditions}

### The Race Condition Problem

**What is a race condition?**
When the correctness of a program depends on the timing of events, and different orderings produce different results.

### Possible Event Orderings

**Scenario 1: Worker 1 finds it first**

```
Time  Event
0ms   Start both workers
10ms  Worker 1 sends message: found at index 3
11ms  w1.on('message') fires
      - result1 = 3
      - index !== -1, so terminate w2
      - resolve(3)
20ms  Worker 2 would have sent message, but it's dead
```

**Result**: Correctly returns 3, w2 never completes

**Scenario 2: Worker 2 finds it first**

```
Time  Event
0ms   Start both workers
15ms  Worker 2 sends message: found at index 7
16ms  w2.on('message') fires
      - result2 = 7
      - index !== -1, so terminate w1
      - resolve(7)
25ms  Worker 1 would have sent message, but it's dead
```

**Result**: Correctly returns 7, w1 never completes

**Scenario 3: Both find nothing (normal order)**

```
Time  Event
0ms   Start both workers
50ms  Worker 1 sends message: -1 (not found)
51ms  w1.on('message') fires
      - result1 = -1
      - index === -1, so call checkComplete()
      - result2 is still null, checkComplete returns early
60ms  Worker 2 sends message: -1 (not found)
61ms  w2.on('message') fires
      - result2 = -1
      - index === -1, so call checkComplete()
      - Both results ready!
      - checkComplete terminates both, logs, resolve(-1)
```

**Result**: Correctly returns -1

**Scenario 4: Both find nothing (reverse order)**

```
Time  Event
0ms   Start both workers
55ms  Worker 2 sends message: -1 (not found)
56ms  w2.on('message') fires
      - result2 = -1
      - checkComplete() → result1 is null, return early
65ms  Worker 1 sends message: -1 (not found)
66ms  w1.on('message') fires
      - result1 = -1
      - checkComplete() → both ready, resolve(-1)
```

**Result**: Correctly returns -1

### Why This Design is Race-Condition-Safe

**1. No shared mutable state between workers:**

- Each worker has its own copy of the array slice
- No shared memory (except via message passing)
- Workers cannot interfere with each other

**2. The Promise resolves exactly once:**

```typescript
resolve(value);
```

- Calling `resolve()` multiple times does nothing after the first call
- Promise transitions from "pending" to "fulfilled" irreversibly
- Even if both workers find the target, only first `resolve()` matters

**3. The `null` check prevents premature resolution:**

```typescript
if (result1 === null || result2 === null) return;
```

- This is a **synchronization primitive**
- Ensures we only proceed when both workers have reported
- Without this, we'd resolve too early

**4. Termination is idempotent:**

```typescript
w1.terminate();
w2.terminate();
```

- Calling `terminate()` on already-terminated worker does nothing
- No error thrown
- Safe to call multiple times

### What Could Go Wrong (If Code Were Different)

**Bad Design 1: No early exit**

```typescript
// BAD CODE - don't do this
w1.on("message", (index) => {
  result1 = index;
  checkComplete(); // Always wait for both
});
```

**Problem**: Even if w1 finds target, we wait for w2 to finish. Wastes time.

**Bad Design 2: No null check**

```typescript
// BAD CODE - don't do this
const checkComplete = () => {
  // No guard clause!
  const finalResult = result1 !== -1 ? result1 : result2;
  resolve(finalResult);
};
```

**Problem**: If w1 finishes first with -1, `result2` is still `null`, causing bugs.

**Bad Design 3: Race on resolve**

```typescript
// BAD CODE - don't do this
w1.on("message", (index) => {
  resolve(index); // No checking if w2 already resolved
});
w2.on("message", (index) => {
  resolve(index); // Race!
});
```

**Problem**: Both might resolve, leading to undefined behavior. Our code avoids this with the early-exit pattern.

---

## Performance Characteristics {#performance}

### Time Complexity Analysis

**Sequential Linear Search:**

- Best: O(1) - found immediately
- Average: O(n/2) = O(n) - found in middle
- Worst: O(n) - not found or at end

**Parallel Linear Search:**

- Best: O(1) + overhead - found immediately in either half
- Average: O(n/4) + overhead - found in middle (both workers check n/4 on average)
- Worst: O(n/2) + overhead - not found (both check n/2 simultaneously)

**Overhead includes:**

- Worker spawn: ~10-50ms per worker (2 workers = 20-100ms)
- Data serialization: O(n) time to copy array slices
- Message passing: ~1-5ms per message
- Termination: ~1-10ms per worker

### When Does This Actually Help?

**Formula for speedup:**

```
Speedup = (Sequential Time) / (Parallel Time)

Sequential Time = n * t_compare
Parallel Time = overhead + (n/2 * t_compare)

Where:
n = array length
t_compare = time per comparison (~0.000001ms for number equality)
overhead = ~50-100ms
```

**Breakeven point:**

```
n * t_compare = overhead + (n/2 * t_compare)
n/2 * t_compare = overhead
n = 2 * overhead / t_compare
n = 2 * 50ms / 0.000001ms
n = 100,000,000 comparisons
```

**In practice:**

- **Tiny arrays (n < 1,000)**: Parallel is 50-100x SLOWER (overhead dominates)
- **Small arrays (n = 10,000)**: Parallel is ~2-5x SLOWER
- **Medium arrays (n = 100,000)**: Parallel is ~1.5x speedup
- **Large arrays (n = 1,000,000)**: Parallel is ~1.8x speedup
- **Huge arrays (n = 10,000,000)**: Parallel is ~1.9x speedup

**Why not 2x speedup?**

1. Overhead (~50-100ms) amortizes over larger n, but never disappears
2. Array copying is O(n) and not parallelized
3. Message passing latency
4. CPU cache effects (workers have separate caches)

### Space Complexity

**Sequential:**

- O(1) - no extra space besides input

**Parallel:**

- O(n) - we copy the entire array into two slices
- Plus ~20-60MB for two worker processes

### Real-World Benchmarks

Running on a machine with 4-core CPU (hypothetical):

```
Array Size | Sequential | Parallel | Speedup | Note
-----------|------------|----------|---------|------------------
100        | 0.001ms    | 52ms     | 0.00002x| Overhead kills it
1,000      | 0.01ms     | 53ms     | 0.0002x | Still terrible
10,000     | 0.1ms      | 55ms     | 0.002x  | Getting better
100,000    | 1ms        | 30ms     | 0.03x   | Overhead = 50ms
1,000,000  | 10ms       | 35ms     | 0.28x   | 10/2 + 30 overhead
10,000,000 | 100ms      | 80ms     | 1.25x   | 100/2 + 30 overhead
100,000,000| 1000ms     | 530ms    | 1.88x   | Finally worth it!
```

**Key insight**: You need **very large** arrays for parallelism to pay off with linear search.

---

## Trade-offs and When to Use {#tradeoffs}

### Advantages of Parallel Search

✅ **CPU utilization**: Uses multiple cores instead of one  
✅ **Scalability**: Speedup increases with array size (asymptotically approaches 2x)  
✅ **Responsiveness**: Can find elements near start/end quickly  
✅ **Learning value**: Demonstrates parallelism concepts

### Disadvantages

❌ **Overhead**: 50-100ms startup cost makes it slower for small/medium arrays  
❌ **Memory**: Copies entire array (O(n) space vs O(1))  
❌ **Complexity**: 10x more code than sequential version  
❌ **Diminishing returns**: Never better than 2x (with 2 workers)  
❌ **Resource usage**: Consumes extra CPU cores that could do other work

### When to Use Parallel Linear Search

**Good fit:**

- Array has **millions** of elements
- You're searching repeatedly on the same large array
- You have spare CPU cores (not already at 100% utilization)
- Target is likely near start or end (early exit benefit)

**Bad fit:**

- Arrays under 100,000 elements
- One-off searches
- Memory constrained environments
- When you can use a better algorithm (see below)

### Better Alternatives

**1. Binary Search (if array is sorted):**

```typescript
// O(log n) - vastly better than O(n)
function binarySearch(arr: number[], target: number): number {
  let left = 0,
    right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
```

- O(log n) is **exponentially faster** than O(n)
- For n=1,000,000: binary search does ~20 comparisons vs 1,000,000 for linear
- No parallelism needed!

**2. Hash Table (if you can preprocess):**

```typescript
// O(1) lookup after O(n) setup
const map = new Map(arr.map((val, idx) => [val, idx]));
const index = map.get(target) ?? -1;
```

- Constant time O(1) lookup
- Requires O(n) extra space
- One-time O(n) preprocessing

**3. Parallel Binary Search (best of both worlds):**

- If sorted, divide range into chunks and binary search each chunk in parallel
- Much better than parallel linear search

### The Real-World Lesson

**Parallel linear search is almost never the right choice in production.**

**Why?**

- If unsorted and small → Sequential is fine
- If unsorted and large → Hash it or accept O(n)
- If sorted → Binary search dominates
- If you need parallelism → There are better parallel algorithms

**But it's a great learning tool because:**

- Simple enough to understand completely
- Demonstrates worker threads, message passing, synchronization
- Shows the overhead/benefit tradeoff of parallelism
- Illustrates Amdahl's Law in practice

---

## Summary

### What We Built

A parallel linear search that:

1. Splits array in half
2. Searches both halves simultaneously using worker threads
3. Returns as soon as either worker finds the target
4. Waits for both workers if target not found
5. Logs which worker found it and how long it took

### Key Takeaways

🎯 **Parallelism requires overhead management**

- Workers aren't free (~50-100ms startup)
- Only worth it for large datasets

🎯 **Message passing is how workers communicate**

- Data is copied, not shared
- Workers are isolated for safety

🎯 **Synchronization prevents race conditions**

- Guard clauses (null checks) ensure correctness
- Early exits optimize performance

🎯 **Algorithm choice matters more than parallelism**

- O(log n) beats O(n/2) for any large n
- Right data structure > brute force parallelism

### The Mental Model

Think of parallel search like hiring workers:

- **Hiring cost**: Worker creation overhead
- **Training cost**: Data serialization
- **Communication cost**: Message passing
- **Benefit**: Work done in parallel

Only hire workers if the work is big enough to justify the hiring/training/communication costs. For small jobs (small arrays), just do it yourself (sequential).
