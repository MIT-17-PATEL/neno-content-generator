export interface TestSuite {
  name: string;
  tests: {
    description: string;
    fn: () => Promise<void> | void;
  }[];
}

export function createSuite(name: string) {
  const suite: TestSuite = { name, tests: [] };
  const test = (description: string, fn: () => Promise<void> | void) => {
    suite.tests.push({ description, fn });
  };
  return { suite, test };
}

export function assert(condition: unknown, message: string = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals<T>(actual: T, expected: T, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      message || `Expected ${expectedStr} but received ${actualStr}`
    );
  }
}

export function assertIncludes(haystack: string, needle: string, message?: string) {
  if (!haystack.includes(needle)) {
    throw new Error(
      message || `Expected string to contain "${needle}" but it was missing.`
    );
  }
}

export function assertThrows(fn: () => unknown, expectedErrorSubstr?: string) {
  let threw = false;
  try {
    fn();
  } catch (err: unknown) {
    threw = true;
    if (expectedErrorSubstr && err instanceof Error) {
      if (!err.message.includes(expectedErrorSubstr)) {
        throw new Error(
          `Expected error message to contain "${expectedErrorSubstr}" but got "${err.message}"`
        );
      }
    }
  }
  if (!threw) {
    throw new Error("Expected function to throw an error, but it succeeded.");
  }
}
