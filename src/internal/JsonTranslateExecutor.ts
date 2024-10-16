import { JsonTranslator } from "../JsonTranslator";

/**
 * @internal
 */
export namespace JsonTranslateExecutor {
  /* -----------------------------------------------------------
    PREPARE COLLECTION
  ----------------------------------------------------------- */
  export interface ICollection {
    output: any;
    raw: string[];
    setters: Setter<string>[];
  }
  export type Setter<T> = (input: T) => void;

  export const prepare = (props: JsonTranslator.IProps<any>): ICollection => {
    const ptr = {
      value: JSON.parse(JSON.stringify(props.input)),
    };
    const raw: string[] = [];
    const setters: Map<string, Setter<string>> = new Map();
    visit({
      filter: props.filter,
      raw,
      setters,
      set: (x) => (ptr.value = x),
      dictionary: props.dictionary ?? null,
      value: ptr.value,
      explore: {
        object: null,
        key: null,
        index: null,
        accessor: ["$input"],
      },
    });
    return {
      output: ptr.value,
      raw,
      setters: Array.from(setters.values()),
    };
  };

  const visit = (next: {
    filter: JsonTranslator.IProps<any>["filter"];
    dictionary: Record<string, string> | null;
    raw: string[];
    setters: Map<string, Setter<string>>;
    set: Setter<any>;
    value: any;
    explore: Omit<JsonTranslator.IExplore, "value">;
  }): void => {
    if (typeof next.value === "string") {
      if (next.value.trim().length === 0) return;
      else if (
        next.filter &&
        !next.filter({
          ...next.explore,
          value: next.value,
        })
      )
        return;
      else if (
        next.dictionary &&
        typeof next.dictionary[next.value] === "string"
      ) {
        next.set(next.dictionary[next.value]);
        return;
      }
      const found: Setter<string> | undefined = next.setters.get(next.value);
      if (found !== undefined) {
        next.setters.set(next.value, (str) => {
          next.set(str);
          found(str);
        });
      } else {
        next.raw.push(next.value);
        next.setters.set(next.value, next.set);
      }
    } else if (Array.isArray(next.value))
      next.value.forEach((elem, i) =>
        visit({
          ...next,
          explore: {
            ...next.explore,
            index: i,
            accessor: [...next.explore.accessor, i.toString()],
          },
          set: (x) => (next.value[i] = x),
          value: elem,
        }),
      );
    else if (typeof next.value === "object" && next.value !== null)
      Object.entries(next.value).forEach(([key, elem]) =>
        visit({
          ...next,
          explore: {
            ...next.explore,
            object: next.value,
            key,
            index: null,
            accessor: [...next.explore.accessor, key],
          },
          set: (x) => (next.value[key] = x),
          value: elem,
        }),
      );
  };

  /* -----------------------------------------------------------
    LIST UP TEXTS
  ----------------------------------------------------------- */
  export const getTexts = (
    props: Omit<JsonTranslator.IProps<any>, "source" | "target">,
  ): string[] => {
    const output: Set<string> = new Set();
    const visited: WeakSet<object> = new WeakSet();
    visitTexts({
      filter: props.filter,
      dictionary: props.dictionary ?? null,
      output,
      visited,
      value: props.input,
      explore: {
        object: null,
        key: null,
        index: null,
        accessor: ["$input"],
      },
    });
    return Array.from(output);
  };

  const visitTexts = (next: {
    filter: JsonTranslator.IProps<any>["filter"];
    dictionary: Record<string, string> | null;
    output: Set<string>;
    visited: WeakSet<object>;
    value: any;
    explore: Omit<JsonTranslator.IExplore, "value">;
  }): void => {
    if (typeof next.value === "string") {
      if (next.value.length === 0) return;
      else if (
        next.filter &&
        !next.filter({
          ...next.explore,
          value: next.value,
        })
      )
        return;
      else if (
        next.dictionary &&
        typeof next.dictionary[next.value] === "string"
      )
        return;
      else next.output.add(next.value);
    } else if (Array.isArray(next.value))
      next.value.forEach((elem, i) =>
        visitTexts({
          ...next,
          value: elem,
          explore: {
            ...next.explore,
            index: i,
          },
        }),
      );
    else if (typeof next.value === "object" && next.value !== null)
      Object.entries(next.value).forEach(([key, value]) =>
        visitTexts({
          ...next,
          explore: {
            ...next.explore,
            object: next.value,
            key,
            index: null,
          },
          value,
        }),
      );
  };
}
