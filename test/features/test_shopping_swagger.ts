import { JsonTranslator } from "@samchon/translate-json";
import fs from "fs";

import input from "../../assets/input/shopping.swagger.json";

export const test_connector_swagger = async (
  translator: JsonTranslator,
): Promise<void> => {
  for (const lang of ["ko", "ja", "ar"])
    await fs.promises.writeFile(
      `${__dirname}/../../../assets/output/shopping.swagger.${lang}.json`,
      JSON.stringify(
        await translator.translate({
          input,
          to: lang,
          filter: (explore) =>
            explore.key === "title" ||
            explore.key === "description" ||
            explore.key === "summary" ||
            explore.key === "x-wrtn-placeholder",
        }),
        null,
        2,
      ),
      "utf8",
    );
};
