# `@samchon/json-translator`
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/samchon/json-translator/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/@samchon/json-translator.svg)](https://www.npmjs.com/package/@samchon/json-translator)
[![Downloads](https://img.shields.io/npm/dm/@samchon/json-translator.svg)](https://www.npmjs.com/package/@samchon/json-translator)
[![Build Status](https://github.com/samchon/json-translator/workflows/build/badge.svg)](https://github.com/samchon/json-translator/actions?query=workflow%3Abuild)

```bash
npm install @samchon/json-translate 
```

Translate JSON file via Google Translate API.

`@samchon/json-translate` is a wrapper library that translates JSON files through the Google Translate API. 

`@samchon/json-translate` provides a more convenient way to translate JSON data, including optimization strategies reducing the cost and diminishing elapsed time of the translation just by minimizing the number of the Google Translate API calls.




## How to use
Just import `JsonTranslator` class and construct with credential information.

After that, call the `JsonTranslator.translate()` function with JSON `input` value and `target` language.

If you want to filter some specific values to translate, compose the `filter` function.

Here is an example code utilizing the `JsonTranslator` class to translate OpenAPI document.

```typescript
import { OpenApi } from "@samchon/openapi";
import { JsonTranslator } from "@samchon/json-translator";

const main = async (): Promise<void> => {
  const translator: JsonTranslator = new JsonTranslator({
    credentials: {... },
  });
  const input: OpenApi.IDocument = { ... };
  const output: OpenApi.IDocument = await translator.translate({
    input, // JSON input data to translate
    target: "ko", // target language to translate
    // source: "en", // current language, but not essential
    filter: (explore) =>
      explore.object !== null &&
      explore.index === null &&
      (
        explore.key === "title" ||
        explore.key === "description" ||
        explore.key === "summary" ||
        explore.key === "x-wrtn-placeholder"
      )
  });
  console.log(output);
};
main().catch(console.error);
```

Also, below is the list of example result files of such translation.

English (source) | Korean | Japanese | Arabic
--------|--------|----------|--------
[bbs.article.json](https://github.com/samchon/json-translator/blob/master/assets/input/bbs.article.json) | [bbs.ko.json](https://github.com/samchon/json-translator/blob/master/assets/output/bbs.article.ko.json) | [bbs.ja.json](https://github.com/samchon/json-translator/blob/master/assets/output/bbs.article.ja.json) | [bbs.ar.json](https://github.com/samchon/json-translator/blob/master/assets/output/bbs.article.ar.json)
[shopping.swagger.json](https://github.com/samchon/json-translator/blob/master/assets/input/shopping.swagger.json) | [shopping.ko.json](https://github.com/samchon/json-translator/blob/master/assets/output/shopping.swagger.ko.json) | [shopping.ja.json](https://github.com/samchon/json-translator/blob/master/assets/output/shopping.swagger.ja.json) | [shopping.ar.json](https://github.com/samchon/json-translator/blob/master/assets/output/shopping.swagger.ar.json)