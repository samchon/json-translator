import { Translate } from "@google-cloud/translate/build/src/v2";

export class JsonTranslator {
  private readonly service_: Translate;

  public constructor(options?: ConstructorParameters<typeof Translate>[0]) {
    this.service_ = new Translate(options);
  }

  public async translate<T>(props: JsonTranslator.IProps<T>): Promise<T> {
    const collection: ICollection = prepareCollection(props);
    const translated: string[] = [];
    const from: string | undefined =
      props.from ?? (await this.detect(collection.raw));

    let queue: Array<IPiece> = [];
    let bytes: number = 0;
    const execute = async () => {
      if (queue.length) {
        const [response] = await this.service_.translate(
          queue.map((p) => p.text),
          {
            from,
            to: props.to,
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
  export interface IProps<T> {
    input: T;
    from?: string;
    to: string;
    filter?: (explore: IExplore) => boolean;
  }
  export interface IExplore {
    object: object | null;
    key: string | null;
    index: number | null;
    accessor: string[];
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
          accessor: [...next.explore.accessor, key],
        },
        setter: (x) => (next.value[key] = x),
        value: elem,
      }),
    );
};
