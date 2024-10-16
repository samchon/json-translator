import { TestValidator } from "@nestia/e2e";
import { JsonTranslateComposer } from "@samchon/json-translator/lib/internal/JsonTranslateComposer";

export const test_duplicated = (): void => {
  const nested: INested = {
    x: "hello",
    y: "world",
    z: "hello",
    array: ["hello", "world", "hello", "world"],
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
    });
  TestValidator.equals("collection.raw.length")(collection.raw.length)(2);
  TestValidator.equals("collection.setters.length")(collection.setters.length)(
    2,
  );
  collection.setters[0]("안녕");
  collection.setters[1]("세계");

  const translatedNested: INested = {
    x: "안녕",
    y: "세계",
    z: "안녕",
    array: ["안녕", "세계", "안녕", "세계"],
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
