import { TestValidator } from "@nestia/e2e";
import { JsonTranslateExecutor } from "@samchon/json-translator/lib/internal/JsonTranslateExecutor";

export const test_texts = (): void => {
  const input = {
    x: "x",
    y: "y",
    z: "z",
    nested: {
      alpha: "alpha",
      beta: "beta",
      reserved: "reserved",
    },
    exceptional: "exceptional",
    array: ["one", "two", "three"],
    elements: [
      {
        first: "first",
        second: "second",
      },
      {
        third: "third",
        fourth: "fourth",
      },
    ],
  };
  const texts: string[] = JsonTranslateExecutor.getTexts({
    input,
    filter: (explore) => explore.key !== "exceptional",
    dictionary: {
      reserved: "reserved",
    },
  });
  TestValidator.equals("texts")(texts)([
    "x",
    "y",
    "z",
    "alpha",
    "beta",
    "one",
    "two",
    "three",
    "first",
    "second",
    "third",
    "fourth",
  ]);
};
