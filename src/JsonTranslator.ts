import { Translate } from "@google-cloud/translate/build/src/v2";

import { JsonTranslateExecutor } from "./internal/JsonTranslateExecutor";

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
  private readonly service_: Translate;

  public constructor(options?: ConstructorParameters<typeof Translate>[0]) {
    this.service_ = new Translate(options);
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
    const collection: JsonTranslateExecutor.ICollection =
      JsonTranslateExecutor.prepare(props);
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
          },
        );
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
      .flat();
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
   * Therefore, if you want to filter some specific values to participate in
   * the language detection, fill the {@link JsonTranslator.IProps.filter}
   * function.
   *
   * @param input Properties for language detection.
   * @returns The detected language or `undefined` if the language is unknown.
   */
  public async detect<T>(
    props: Omit<JsonTranslator.IProps<T>, "source" | "target">,
  ): Promise<string | undefined> {
    const texts: string[] = JsonTranslateExecutor.getTexts(props);
    return this._Detect_language(texts);
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

interface IPiece {
  text: string;
  length: number;
}
const SEPARATOR = " //|-0-|\\ ";
