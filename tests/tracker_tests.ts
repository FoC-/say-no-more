import { Tracker } from "../src/experiments";
import { assert } from "./utils";

export const expectedPath = () => {
  const tracker = new Tracker();
  assert(tracker.current).equal("");
  tracker.start();
  assert(tracker.current).equal("0");
  tracker.start();
  assert(tracker.current).equal("0.0");
  tracker.start();
  assert(tracker.current).equal("0.0.0");
  tracker.stop();
  tracker.start();
  assert(tracker.current).equal("0.0.1");
  tracker.stop();
  assert(tracker.current).equal("0.0");
  tracker.stop();
  assert(tracker.current).equal("0");
  tracker.stop();
  assert(tracker.current).equal("");
  tracker.start();
  assert(tracker.current).equal("1");
  tracker.stop();
  tracker.reset();
  tracker.start();
  assert(tracker.current).equal("0");
  tracker.stop();
};
