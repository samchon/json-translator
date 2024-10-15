import { TestValidator } from "@nestia/e2e";
import { JsonTranslateExecutor } from "@samchon/json-translator/lib/internal/JsonTranslateExecutor";

export const test_dictionary = (): void => {
  const nested: INested = {
    x: "hello",
    y: "brothers",
    z: "sisters",
    array: ["hello", "brothers", "sisters", "descendants"],
  };
  const input: IData = {
    ...nested,
    nested,
    instances: new Array(5).fill(nested),
  };
  const collection: JsonTranslateExecutor.ICollection =
    JsonTranslateExecutor.prepare({
      input,
      target: "ko",
      dictionary: {
        brothers: "형제님들",
        sisters: "자매님들",
        descendants: "후손님들",
      },
    });
  collection.setters[0]("안녕하세요");

  const translatedNested: INested = {
    x: "안녕하세요",
    y: "형제님들",
    z: "자매님들",
    array: ["안녕하세요", "형제님들", "자매님들", "후손님들"],
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
  array: string[];
}
