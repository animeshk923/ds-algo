import { parentPort, workerData } from "worker_threads";

const { arr, target, offset } = workerData;

for (let i = 0; i < arr.length; i++) {
  if (arr[i] === target) {
    parentPort?.postMessage(offset + i);
    process.exit(0);
  }
}

parentPort?.postMessage(-1);
