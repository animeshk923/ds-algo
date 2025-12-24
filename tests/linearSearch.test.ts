import {
  linearSearchBool,
  linearSearchIndex,
  linearSearchValAndIndex,
} from "../src/algo/linearSearch";

describe("linearSearchBool", () => {
  describe("Basic functionality", () => {
    it("should return true when element is found at the beginning", () => {
      const arr = [1, 3, 5, 7, 9];
      expect(linearSearchBool(arr, 1)).toBe(true);
    });

    it("should return true when element is found in the middle", () => {
      const arr = [1, 3, 5, 7, 9];
      expect(linearSearchBool(arr, 5)).toBe(true);
    });

    it("should return true when element is found at the end", () => {
      const arr = [1, 3, 5, 7, 9];
      expect(linearSearchBool(arr, 9)).toBe(true);
    });

    it("should return false when element is not found", () => {
      const arr = [1, 3, 5, 7, 9];
      expect(linearSearchBool(arr, 6)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const arr: number[] = [];
      expect(linearSearchBool(arr, 5)).toBe(false);
    });

    it("should handle single element array when found", () => {
      const arr = [5];
      expect(linearSearchBool(arr, 5)).toBe(true);
    });

    it("should handle single element array when not found", () => {
      const arr = [5];
      expect(linearSearchBool(arr, 3)).toBe(false);
    });
  });

  describe("Different data types", () => {
    it("should work with strings", () => {
      const arr = ["apple", "banana", "cherry"];
      expect(linearSearchBool(arr, "banana")).toBe(true);
      expect(linearSearchBool(arr, "grape")).toBe(false);
    });

    it("should work with boolean values", () => {
      const arr = [true, false, true];
      expect(linearSearchBool(arr, true)).toBe(true);
      expect(linearSearchBool(arr, false)).toBe(true);
    });
  });
});

describe("linearSearchIndex", () => {
  describe("Basic functionality", () => {
    it("should return correct index when element is found", () => {
      const arr = [1, 3, 5, 7, 9];
      expect(linearSearchIndex(arr, 1)).toBe(0);
      expect(linearSearchIndex(arr, 5)).toBe(2);
      expect(linearSearchIndex(arr, 9)).toBe(4);
    });

    it("should return -1 when element is not found", () => {
      const arr = [1, 3, 5, 7, 9];
      expect(linearSearchIndex(arr, 6)).toBe(-1);
    });

    it("should return first occurrence when there are duplicates", () => {
      const arr = [1, 3, 5, 5, 5, 7, 9];
      expect(linearSearchIndex(arr, 5)).toBe(2);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const arr: number[] = [];
      expect(linearSearchIndex(arr, 5)).toBe(-1);
    });

    it("should handle single element array", () => {
      const arr = [5];
      expect(linearSearchIndex(arr, 5)).toBe(0);
      expect(linearSearchIndex(arr, 3)).toBe(-1);
    });
  });

  describe("Different data types", () => {
    it("should work with strings", () => {
      const arr = ["apple", "banana", "cherry", "date"];
      expect(linearSearchIndex(arr, "cherry")).toBe(2);
      expect(linearSearchIndex(arr, "grape")).toBe(-1);
    });

    it("should work with objects", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const obj3 = { id: 3 };
      const arr = [obj1, obj2, obj3];
      expect(linearSearchIndex(arr, obj2)).toBe(1);
      expect(linearSearchIndex(arr, { id: 2 })).toBe(-1);
    });
  });
});

describe("linearSearchValAndIndex", () => {
  describe("Basic functionality", () => {
    it("should return object with value and index when element is found", () => {
      const arr = [10, 20, 30, 40];
      const result = linearSearchValAndIndex(arr, 30);
      expect(result).toEqual({ index: 2, value: 30 });
    });

    it("should return undefined when element is not found", () => {
      const arr = [10, 20, 30, 40];
      const result = linearSearchValAndIndex(arr, 50);
      expect(result).toBeUndefined();
    });

    it("should return first occurrence when there are duplicates", () => {
      const arr = [10, 20, 30, 30, 40];
      const result = linearSearchValAndIndex(arr, 30);
      expect(result).toEqual({ index: 2, value: 30 });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const arr: number[] = [];
      const result = linearSearchValAndIndex(arr, 5);
      expect(result).toBeUndefined();
    });

    it("should handle single element array when found", () => {
      const arr = [5];
      const result = linearSearchValAndIndex(arr, 5);
      expect(result).toEqual({ index: 0, value: 5 });
    });

    it("should handle single element array when not found", () => {
      const arr = [5];
      const result = linearSearchValAndIndex(arr, 3);
      expect(result).toBeUndefined();
    });
  });

  describe("Different data types", () => {
    it("should work with strings", () => {
      const arr = ["apple", "banana", "cherry"];
      const result = linearSearchValAndIndex(arr, "banana");
      expect(result).toEqual({ index: 1, value: "banana" });
    });

    it("should work with mixed number types", () => {
      const arr = [1.5, 2.5, 3.5, 4.5];
      const result = linearSearchValAndIndex(arr, 3.5);
      expect(result).toEqual({ index: 2, value: 3.5 });
    });
  });
});
