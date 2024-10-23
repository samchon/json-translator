import {
  Translate,
  TranslateConfig,
} from "@google-cloud/translate/build/src/v2";

import { JsonTranslateComposer } from "./internal/JsonTranslateComposer";

/**
 * JSON Translator.
 *
 * `JsonTranslator` is a class translating JSON data into another language.
 *
 * It wraps the `@google-cloud/translate` module and provides
 * a more convenient way to translate JSON data, including optimization
 * strategy reducing the cost and elapsed time of the translation by
 * minimizing the number of the API calls.
 *
 * @reference
 * @author Jeongho Nam - https://github.com/samchon
 */
export class JsonTranslator {
  private readonly options_: JsonTranslator.IOptions;
  private readonly service_: Translate;

  public constructor(options?: JsonTranslator.IOptions) {
    this.options_ = options ?? {};
    this.service_ = new Translate(this.options_);
  }

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
  public async translate<T>(props: JsonTranslator.IProps<T>): Promise<T> {
    const collection: JsonTranslateComposer.ICollection =
      JsonTranslateComposer.composeCollection(props);
    const translated: string[] = [];
    const from: string | undefined =
      props.source === null
        ? undefined
        : (props.source ?? (await this._Detect_language(collection.raw)));

    let queue: Array<IPiece> = [];
    let bytes: number = 0;
    const execute = async () => {
      if (queue.length) {
        const [response] = await this.service_.translate(
          queue.map((p) => p.text),
          {
            from,
            to: props.target,
            format: "html",
          },
        );
        const expected: number = queue
          .map((p) => p.text.split(SEPARATOR).length)
          .reduce((x, y) => x + y, 0);
        const actual: number = response
          .map((s) => s.split(SEPARATOR).length)
          .reduce((x, y) => x + y, 0);
        if (expected !== actual) {
          queue.forEach((q, i) => {
            const input: string[] = q.text.split(SEPARATOR);
            const output: string[] = response[i].split(SEPARATOR);
            if (input.length !== output.length)
              console.log({
                from: q.text,
                to: response[i],
                input: Object.fromEntries(input.map((s, i) => [i, s])),
                output: Object.fromEntries(output.map((s, i) => [i, s])),
              });
          });
          throw new Error(
            `Mismatched translation count. Delivered ${expected} count string values to the Google Translate API, but received number is ${actual}.`,
          );
        }
        translated.push(...response);
      }
      queue = [];
      bytes = 0;
    };

    for (const text of collection.raw) {
      const length: number = new Blob([text]).size;
      if (bytes >= 150_000 || queue.length >= 128) await execute();

      const last: IPiece | undefined = queue.at(-1);
      if (last === undefined || last.length + SEPARATOR.length + length >= 500)
        queue.push({
          text,
          length,
        });
      else {
        last.text += SEPARATOR + text;
        last.length += length;
      }
      bytes += length;
    }
    if (queue.length) await execute();

    const transformed: string[] = translated
      .map((s) => s.split(SEPARATOR))
      .flat()
      .map((s) => s.trim());
    collection.setters.forEach((setter, i) => {
      if (transformed[i]) setter(transformed[i]);
    });
    return collection.output;
  }

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

  /**
   * @internal
   */
  private async _Detect_language(texts: string[]): Promise<string | undefined> {
    let longest: string | undefined = undefined;
    for (const str of texts)
      if (str.length > (longest?.length ?? 0)) longest = str;
    if (longest === undefined) return undefined;
    const [response] = await this.service_.detect(longest);
    const res: string | undefined = response.language ?? undefined;
    return res === "und" ? undefined : res;
  }
}
export namespace JsonTranslator {
  /**
   * Options for the JSON Translator consturctor.
   */
  export type IOptions = TranslateConfig;

  /**
   * Properties for the translation.
   *
   * Keyworded properties used in the {@link JsonTranslator.translate} method.
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

/**
 * @internal
 */
interface IPiece {
  text: string;
  length: number;
}

/**
 * @internal
 */
const SEPARATOR = `<span translate="no"></span>`;
