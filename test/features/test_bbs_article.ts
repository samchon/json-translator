import { JsonTranslator } from "@samchon/translate-json";
import fs from "fs";

import input from "../../assets/input/bbs.article.json";

export const test_bbs_article = async (
  translator: JsonTranslator,
): Promise<void> => {
  for (const lang of ["ko", "ja", "ar"])
    await fs.promises.writeFile(
      `${__dirname}/../../../assets/output/bbs.article.${lang}.json`,
      JSON.stringify(
        await translator.translate({
          input,
          to: lang,
          filter: ({ key }) => key === "title" || key === "body",
        }),
        null,
        2,
      ),
      "utf8",
    );
};
