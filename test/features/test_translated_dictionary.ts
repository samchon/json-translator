import { TestValidator } from "@nestia/e2e";
import { JsonTranslator } from "@samchon/json-translator";

export const test_translated_dictionary = (service: JsonTranslator): void => {
  for (const primitive of [true, false]) test(service, primitive);
};

const test = (service: JsonTranslator, primitive: boolean): void => {
  const input: IData = (() => {
    const nested: INested = {
      hello: "hello",
      brothers: "brothers",
      sisters: "sisters",
      ancestors: "ancestors",
      decentants: "decentants",
      array: ["hello", "brothers", "sisters", "ancenstors", "descendants"],
    };
    const input: IData = {
      ...nested,
      nested,
      instances: new Array(5).fill(nested),
    };
    return primitive ? JSON.parse(JSON.stringify(input)) : input;
  })();
  const output: IData = (() => {
    const translatedNested: INested = {
      hello: "안녕하세요",
      brothers: "형제님들",
      sisters: "자매님들",
      ancestors: "조상님들",
      decentants: "후손님들",
      array: ["안녕하세요", "형제님들", "자매님들", "조상님들", "후손님들"],
    };
    return {
      ...translatedNested,
      nested: translatedNested,
      instances: new Array(5).fill(translatedNested),
    };
  })();
  const dictionary: Record<string, string> = service.dictionary({
    input,
    output,
    filter: (explore) =>
      explore.key !== "ancestors" &&
      explore.key !== "decentants" &&
      !(
        explore.key === "array" &&
        (explore.index === 3 || explore.index === 4)
      ),
  });
  TestValidator.equals("dictionary")(dictionary)({
    hello: "안녕하세요",
    brothers: "형제님들",
    sisters: "자매님들",
  });
};

interface IData extends INested {
  nested: INested;
  instances: INested[];
}
interface INested {
  hello: string;
  brothers: string;
  sisters: string;
  ancestors: string;
  decentants: string;
  array: string[];
}
