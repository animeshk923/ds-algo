import { binarySearchIndex } from "../src/algo/binarySearch";

describe("binarySearchIndex", () => {
  describe("Basic functionality", () => {
    it("should find element at the beginning of array", () => {
      const arr = [1, 3, 5, 7, 9, 11];
      expect(binarySearchIndex(arr, 1)).toBe(0);
    });

    it("should find element in the middle of array", () => {
      const arr = [1, 3, 5, 7, 9, 11];
      expect(binarySearchIndex(arr, 7)).toBe(3);
    });

    it("should find element at the end of array", () => {
      const arr = [1, 3, 5, 7, 9, 11];
      expect(binarySearchIndex(arr, 11)).toBe(5);
    });

    it("should return -1 when element is not found", () => {
      const arr = [1, 3, 5, 7, 9, 11];
      expect(binarySearchIndex(arr, 6)).toBe(-1);
    });
  });

  describe("Edge cases", () => {
    it("should handle single element array when found", () => {
      const arr = [5];
      expect(binarySearchIndex(arr, 5)).toBe(0);
    });

    it("should handle single element array when not found", () => {
      const arr = [5];
      expect(binarySearchIndex(arr, 3)).toBe(-1);
    });

    it("should handle empty array", () => {
      const arr: number[] = [];
      expect(binarySearchIndex(arr, 5)).toBe(-1);
    });

    it("should handle two element array", () => {
      const arr = [1, 3];
      expect(binarySearchIndex(arr, 1)).toBe(0);
      expect(binarySearchIndex(arr, 3)).toBe(1);
    });
  });

  describe("Different data types", () => {
    it("should work with strings", () => {
      const arr = ["apple", "banana", "cherry", "date"];
      expect(binarySearchIndex(arr, "cherry")).toBe(2);
      expect(binarySearchIndex(arr, "grape")).toBe(-1);
    });

    it("should work with negative numbers", () => {
      const arr = [-10, -5, 0, 5, 10];
      expect(binarySearchIndex(arr, -5)).toBe(1);
      expect(binarySearchIndex(arr, 0)).toBe(2);
      expect(binarySearchIndex(arr, 15)).toBe(-1);
    });

    it("should work with floating point numbers", () => {
      const arr = [1.5, 2.5, 3.5, 4.5];
      expect(binarySearchIndex(arr, 3.5)).toBe(2);
      expect(binarySearchIndex(arr, 2.0)).toBe(-1);
    });
  });

  describe("Large arrays", () => {
    it("should find element in large sorted array", () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i * 2);
      expect(binarySearchIndex(arr, 500)).toBe(250);
      expect(binarySearchIndex(arr, 1998)).toBe(999);
    });

    it("should return -1 for missing element in large array", () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i * 2);
      expect(binarySearchIndex(arr, 501)).toBe(-1);
    });
  });
});
