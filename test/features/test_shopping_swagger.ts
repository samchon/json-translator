import { JsonTranslator } from "@samchon/json-translator";
import { OpenApi } from "@samchon/openapi";
import fs from "fs";
import typia from "typia";

import input from "../../assets/input/shopping.swagger.json";

export const test_shopping_swagger = async (
  translator: JsonTranslator,
): Promise<void> => {
  typia.assertGuard<OpenApi.IDocument>(input);
  for (const lang of ["ko", "ja", "ar"]) {
    const output: OpenApi.IDocument = await translator.translate({
      input,
      target: lang,
      filter: (explore) =>
        explore.key === "title" ||
        explore.key === "description" ||
        explore.key === "summary" ||
        explore.key === "termsOfService" ||
        explore.key === "x-wrtn-placeholder",
    });
    typia.assert(output);
    await fs.promises.writeFile(
      `${__dirname}/../../../assets/output/shopping.swagger.${lang}.json`,
      JSON.stringify(output, null, 2),
      "utf8",
    );
  }
};
