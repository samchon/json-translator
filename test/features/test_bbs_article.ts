import { JsonTranslator } from "@samchon/json-translator";
import fs from "fs";
import typia, { tags } from "typia";

import input from "../../assets/input/bbs.article.json";

export const test_bbs_article = async (
  translator: JsonTranslator,
): Promise<void> => {
  typia.assertGuard<IBbsArticle>(input);
  for (const lang of ["ko", "ja", "ar"]) {
    const output: IBbsArticle = await translator.translate({
      input,
      target: lang,
      filter: ({ key }) => key === "title" || key === "body",
    });
    typia.assert(output);
    await fs.promises.writeFile(
      `${__dirname}/../../../assets/output/bbs.article.${lang}.json`,
      JSON.stringify(output, null, 2),
      "utf8",
    );
  }
};

interface IBbsArticle {
  id: string & tags.Format<"uuid">;
  title: string;
  body: string;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
