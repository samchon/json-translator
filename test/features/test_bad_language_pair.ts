import { TestValidator } from "@nestia/e2e";
import { JsonTranslator } from "@samchon/json-translator";
import typia, { tags } from "typia";

import input from "../../assets/input/bbs.article.json";

export const test_bad_language_pair = async (
  translator: JsonTranslator,
): Promise<void> => {
  typia.assertGuard<IBbsArticle>(input);

  const output: IBbsArticle = await translator.translate({
    input,
    target: "en",
    filter: ({ key }) => key === "title" || key === "body",
  });
  TestValidator.equals("english to english")(input)(output);
};

interface IBbsArticle {
  id: string & tags.Format<"uuid">;
  title: string;
  body: string;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
