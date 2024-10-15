import { Translate } from "@google-cloud/translate/build/src/v2";

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
   * @param props Properties for the translation.
   * @returns The translated JSON data.
   */
  public async translate<T>(props: JsonTranslator.IProps<T>): Promise<T> {
    const collection: ICollection = prepareCollection(props);
    const translated: string[] = [];
    const from: string | undefined =
      props.source ?? (await this.detect(collection.raw));

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
   * Detect the language of the texts.
   *
   * @param texts Texts to detect the language.
   * @returns The detected language or `undefined` if the language is unknown.
   */
  public async detect(texts: string[]): Promise<string | undefined> {
    if (texts.length === 0) return undefined;
    const [response] = await this.service_.detect(
      texts
        .slice()
        .sort((a, b) => b.length - a.length)
        .at(0)!,
    );
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
     */
    source?: string;

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
    filter?: (explore: IExplore) => boolean;
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

interface ICollection {
  output: any;
  raw: string[];
  setters: Array<Setter<string>>;
}
type Setter<T> = (input: T) => void;

const prepareCollection = (props: JsonTranslator.IProps<any>): ICollection => {
  const collection: ICollection = {
    output: JSON.parse(JSON.stringify(props.input)),
    raw: [],
    setters: [],
  };
  visitCollectionData({
    filter: props.filter,
    collection,
    setter: (x) => (collection.output = x),
    value: collection.output,
    explore: {
      object: null,
      key: null,
      index: null,
      accessor: ["$input"],
    },
  });
  return collection;
};

const visitCollectionData = (next: {
  filter: JsonTranslator.IProps<any>["filter"];
  collection: ICollection;
  setter: Setter<any>;
  value: any;
  explore: Omit<JsonTranslator.IExplore, "value">;
}): void => {
  if (typeof next.value === "string" && next.value.trim().length !== 0) {
    if (
      next.filter &&
      !next.filter({
        ...next.explore,
        value: next.value,
      })
    )
      return;
    next.collection.raw.push(next.value);
    next.collection.setters.push(next.setter);
  } else if (Array.isArray(next.value))
    next.value.forEach((elem, i) =>
      visitCollectionData({
        ...next,
        explore: {
          ...next.explore,
          index: i,
          accessor: [...next.explore.accessor, i.toString()],
        },
        setter: (x) => (next.value[i] = x),
        value: elem,
      }),
    );
  else if (typeof next.value === "object" && next.value !== null)
    Object.entries(next.value).forEach(([key, elem]) =>
      visitCollectionData({
        ...next,
        explore: {
          ...next.explore,
          object: next.value,
          key,
          index: null,
          accessor: [...next.explore.accessor, key],
        },
        setter: (x) => (next.value[key] = x),
        value: elem,
      }),
    );
};
