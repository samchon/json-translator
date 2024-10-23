import { JsonTranslator } from "@samchon/json-translator";
import { OpenApi } from "@samchon/openapi";
import fs from "fs";
import typia from "typia";

export const test_swaggers = async (
  translator: JsonTranslator,
): Promise<void> => {
  for (const asset of await getAssets()) {
    const original = await translator.detect({
      input: asset.document,
    });
    for (const lang of ["en", "ko", "ja", "ar"]) {
      if (lang === original) continue;
      const start: number = Date.now();
      const output: OpenApi.IDocument = await translator.translate({
        input: asset.document,
        target: lang,
        filter: (explore) =>
          explore.key === "title" ||
          explore.key === "description" ||
          explore.key === "summary" ||
          explore.key === "termsOfService" ||
          explore.key === "x-wrtn-placeholder",
      });
      typia.assert(output);
      console.log(
        `    - ${asset.name}, ${lang} (${(Date.now() - start).toLocaleString()} ms)`,
      );
      await fs.promises.writeFile(
        `${__dirname}/../../../assets/output/${asset.name}.swagger.${lang}.json`,
        JSON.stringify(output, null, 2),
        "utf8",
      );
    }
  }
};

const getAssets = async (): Promise<IAsset[]> => {
  const directory: string[] = await fs.promises.readdir(
    `${__dirname}/../../../assets/input`,
  );
  const output: IAsset[] = [];
  for (const file of directory) {
    if (file.endsWith(".swagger.json") === false) continue;
    const content: string = await fs.promises.readFile(
      `${__dirname}/../../../assets/input/${file}`,
      "utf8",
    );
    output.push({
      name: file.replace(".swagger.json", ""),
      document: OpenApi.convert(JSON.parse(content)),
    });
  }
  return output;
};

interface IAsset {
  name: string;
  document: OpenApi.IDocument;
}
