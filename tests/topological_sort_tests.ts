import { topological_sort } from "../src/experiments";
import { assert } from "./utils";

export const failure = () => {
  const edges = [
    [1, 2],
    [2, 3],
    [3, 1],
  ];

  try {
    const sorted = topological_sort(edges);
  } catch (e: any) {
    assert(e.message).equal("cyclic dependency: 1 in 3");
  }
};

export const success = () => {
  const edges = [[1, 2, 3], [2, 4, 7, 8], [3, 4], [5, 7, 8], [6]];

  const sorted = topological_sort(edges);
  assert(sorted).equal([4, 7, 8, 2, 3, 1, 5, 6]);
};
