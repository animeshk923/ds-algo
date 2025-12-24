// array declaration
const numbers: number[] = [1, 2, 3, 4, 5];
const names: Array<string> = ["aa", "bb", "cc"];
const mixed: (number | string | boolean)[] = [1, "two", "2", 3, true, false];
const empty: number[] = [];

// operationss
const firstNumber = numbers[0]; // 1
const lastNumber = numbers[numbers.length - 1]; // 5

numbers.push(6); // add to end
numbers.unshift(0); // add to start

numbers.pop(); // remove from end
numbers.shift(); // remove from start

// iterate
numbers.forEach((num, index) => {
  console.log(`Index ${index}: ${num}`);
});

// transform elements
const double = numbers.map((n) => n * 2);

// filter elements
const even = numbers.filter((n) => n % 2 === 0);

// find specific element
const firstEven = numbers.find((n) => n % 2 === 0);

// array of objects
type User = {
  id: number;
  name: string;
  email: string;
};

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" },
];

// 2D array
const matrix: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

// accessing element
const m = matrix[0][1];

export { numbers, names, users, matrix };
