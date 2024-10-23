import { JsonTranslator } from "@samchon/json-translator";
import { OpenApi } from "@samchon/openapi";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import fs from "fs";
import typia from "typia";

import input from "../../assets/input/shopping.swagger.json";

const main = async (): Promise<void> => {
  dotenvExpand.expand(dotenv.config());
  typia.assertGuard<OpenApi.IDocument>(input);

  const translator: JsonTranslator = new JsonTranslator({
    credentials: JSON.parse(process.env.CREDENTIALS ?? "{}"),
  });
  const output: OpenApi.IDocument = await translator.translate({
    input,
    target: "ko",
    filter: (explore) =>
      explore.key === "title" ||
      explore.key === "description" ||
      explore.key === "summary" ||
      explore.key === "termsOfService",
  });
  await fs.promises.writeFile(
    `${__dirname}/../../assets/output/shopping.swagger.ko.json`,
    JSON.stringify(output, null, 2),
    "utf8",
  );

  console.log(
    input.components.schemas["IShoppingExternalUser.ICreate"].properties.uid
      .title,
    (output.components.schemas?.["IShoppingExternalUser.ICreate"] as any)
      ?.properties?.uid.title,
  );
};
main().catch(console.error);
