import { parallelLinearSearch } from "./algo/parallelLinearSearch/parallelLinearSearch";

const arr = Array.from({ length: 1000000 }, (_, i) => i);
// const target = Math.floor(Math.random() * arr.length);
parallelLinearSearch(arr, 879654).then((idx) => console.log("Result:", idx));
