import { TestValidator } from "@nestia/e2e";
import { JsonTranslateComposer } from "@samchon/json-translator/lib/internal/JsonTranslateComposer";

export const test_reserved_dictionary = (): void => {
  const nested: INested = {
    x: "hello",
    y: "brothers",
    z: "sisters",
    ancestors: "ancestors",
    array: ["hello", "brothers", "sisters", "descendants"],
  };
  const input: IData = {
    ...nested,
    nested,
    instances: new Array(5).fill(nested),
  };
  const collection: JsonTranslateComposer.ICollection =
    JsonTranslateComposer.composeCollection({
      input,
      target: "ko",
      dictionary: {
        brothers: "형제님들",
        sisters: "자매님들",
        descendants: "후손님들",
      },
      filter: (explore) =>
        explore.key !== "ancestors" &&
        !(explore.key === "array" && explore.index === 3),
    });
  collection.setters[0]("안녕하세요");

  const translatedNested: INested = {
    x: "안녕하세요",
    y: "형제님들",
    z: "자매님들",
    ancestors: "ancestors",
    array: ["안녕하세요", "형제님들", "자매님들", "descendants"],
  };
  TestValidator.equals("collection.output")(collection.output)({
    ...translatedNested,
    nested: translatedNested,
    instances: new Array(5).fill(translatedNested),
  } satisfies IData);
};

interface IData extends INested {
  nested: INested;
  instances: INested[];
}
interface INested {
  x: string;
  y: string;
  z: string;
  ancestors: string;
  array: string[];
}
