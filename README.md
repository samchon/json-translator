# `@samchon/json-translator`
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/samchon/json-translator/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/@samchon/json-translator.svg)](https://www.npmjs.com/package/@samchon/json-translator)
[![Downloads](https://img.shields.io/npm/dm/@samchon/json-translator.svg)](https://www.npmjs.com/package/@samchon/json-translator)
[![Build Status](https://github.com/samchon/json-translator/workflows/build/badge.svg)](https://github.com/samchon/json-translator/actions?query=workflow%3Abuild)

```bash
npm install @samchon/json-translator
```

Translate JSON file via Google Translate API.

`@samchon/json-translator` is a wrapper library that translates JSON files through the Google Translate API. 

`@samchon/json-translator` provides a more convenient way to translate JSON data, including optimization strategies reducing the cost and diminishing elapsed time of the translation just by minimizing the number of the Google Translate API calls.




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
    target: "ko", // target language code to translate
    // source: "en", // current language code, but not essential
    filter: (explore) =>
      explore.object !== null &&
      explore.index === null &&
      (
        explore.key === "title" ||
        explore.key === "description" ||
        explore.key === "summary" ||
        explore.key === "x-wrtn-placeholder"
      ),
    // dictionary: {
    //   "Primary Key": "식별자 ID",
    // }, // pre-defined translation dictionary
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




## API
### `JsonTranslator.translate()`
```typescript
export class JsonTranslator {
  /**
   * Translate JSON data.
   *
   * `JsonTranslate.translate()` translates JSON input data into another language.
   *
   * If you want to filter some specific values to translate, fill the
   * {@link JsonTranslator.IProps.filter} function.
   *
   * Also, if you do not fill the {@link JsonTranslator.IProps.source} value,
   * the source language would be detected through the {@link JsonTranslator.detect}
   * method with the longest text. Otherwise you assign the `null` value to the
   * {@link JsonTranslator.IProps.source}, the translation would be executed without
   * the source language.
   *
   * @template T The type of the JSON input data.
   * @param props Properties for the translation.
   * @returns The translated JSON data.
   */
  public translate<T>(props: JsonTranslator.IProps<T>): Promise<T>;
}
export namespace JsonTranslator {
  /**
   * Properties for the translation.
   */
  export interface IProps<T> {
    /**
     * The JSON input data to translate.
     */
    input: T;

    /**
     * Source language code.
     *
     * If not specified (`undefined`), the source language would be detected
     * through the {@link JsonTranslator.detect} method with the longest text.
     *
     * Otherwise `null` value assigned, the source language would be skipped,
     * so that the translation would be executed without the source language.
     * Therefore, if your JSON value contains multiple languages, you should
     * assign the `null` value to prevent the source language specification.
     */
    source?: string | null | undefined;

    /**
     * Target language code.
     */
    target: string;

    /**
     * Filter function specifying which data to translate.
     *
     * @param explore Information about the data to explore.
     * @returns `true` if the data should be translated; otherwise, `false`.
     */
    filter?: ((explore: IExplore) => boolean) | null | undefined;

    /**
     * Reserved dictionary of pre-translated values.
     *
     * The dictionary is a key-value pair object containing the pre-translated
     * values. The key means the original value, and the value means the
     * pre-translated value.
     *
     * If this dictionary has been configured and a JSON input value matches to
     * the dictionary's key, the dictionary's value would be used instead of
     * calling the Google Translate API.
     */
    dictionary?: Record<string, string> | null | undefined;
  }

  /**
   * Exploration information used in the {@link IProps.filter} function.
   */
  export interface IExplore {
    /**
     * The parent object instance.
     */
    object: object | null;

    /**
     * The property key containing the {@link value}
     */
    key: string | null;

    /**
     * Index number if the {@link value} is an array element.
     */
    index: number | null;

    /**
     * Accessor path to the {@link value}.
     *
     * It starts from the `["$input"]` array value, and each element
     * would be the property key or the index number.
     *
     * For example, if there's an access expression `$input.a[0].b`,
     * the accessor would be `["$input", "a", "0", "b"]`.
     */
    accessor: string[];

    /**
     * The string value to translate.
     */
    value: string;
  }
}
```

### `JsonTranslator.detect()`
```typescript
export class JsonTranslator {
  /**
   * Detect the language of JSON data.
   *
   * Pick the longest text from the JSON input data and detect the language
   * through the Google Translate API, with the similar properties like the
   * {@link JsonTranslator.translate} method.
   *
   * Therefore, if you want to filter out some specific values to participate in
   * the language detection, fill the {@link JsonTranslator.IDetectProps.filter}
   * function.
   *
   * @param input Properties for language detection.
   * @returns The detected language or `undefined` if the language is unknown.
   */
  public async detect<T>(
    props: JsonTranslator.IDetectProps<T>,
  ): Promise<string | undefined> {
    const texts: string[] = JsonTranslateComposer.composeTexts(props);
    return this._Detect_language(texts);
  }
}
export namespace JsonTranslator {
  /**
   * Properties for the language detection.
   *
   * Keyworded properties used in the {@link JsonTranslator.detect} method.
   */
  export interface IDetectProps<T> {
    /**
     * The JSON input data to detect language.
     */
    input: T;

    /**
     * Filter function specifying which data to translate.
     *
     * @param explore Information about the data to explore.
     * @returns `true` if the data should be translated; otherwise, `false`.
     */
    filter?: ((explore: IExplore) => boolean) | null | undefined;

    /**
     * Reserved dictionary of pre-translated values.
     *
     * The dictionary is a key-value pair object containing the pre-translated
     * values. The key means the original value, and the value means the
     * pre-translated value.
     *
     * If this dictionary has been configured and a JSON input value matches to
     * the dictionary's key, the dictionary's value would be used instead of
     * calling the Google Translate API.
     */
    dictionary?: Record<string, string> | null | undefined;
  }
}
```

### `JsonTranslator.dictionary()`
```typescript
export class JsonTranslator {
  /**
   * Compose dictionary from translated.
   *
   * Compose dictionary between original JSON input data and its translated
   * output data. The dictionary is a key-value pair object containing the
   * original value and its translated value.
   *
   * If you've composed {@link JsonTranslator.IProps.filter} function in
   * the {@link JsonTranslator.translate} method, don't forget to re-apply
   * the filter function to the {@link JsonTranslator.IDictionaryProps.filter}
   * property.
   *
   * @param props Properties for the dictionary composition.
   * @returns Composed dictionary
   */
  public dictionary<T>(
    props: JsonTranslator.IDictionaryProps<T>,
  ): Record<string, string> {
    return JsonTranslateComposer.composeDictionary(props);
  }
}
export namespace JsonTranslator {
  /**
   * Properties for the dictionary composition.
   *
   * Keyworded properties used in nthe {@link JsonTranslator.dictionary} method.
   */
  export interface IDictionaryProps<T> {
    /**
     * Input JSON, the original data.
     */
    input: T;

    /**
     * Output JSON, the translated data.
     */
    output: T;

    /**
     * Filter function specifying which data be translated.
     */
    filter?: ((explore: IExplore) => boolean) | null | undefined;
  }
}
```
