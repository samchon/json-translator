import { JsonTranslator } from "../JsonTranslator";

/**
 * @internal
 */
export namespace JsonTranslateComposer {
  /* -----------------------------------------------------------
    PREPARE COLLECTION
  ----------------------------------------------------------- */
  export interface ICollection {
    output: any;
    raw: string[];
    setters: Setter<string>[];
  }
  export type Setter<T> = (input: T) => void;

  export const composeCollection = (
    props: JsonTranslator.IProps<any>,
  ): ICollection => {
    const ptr = {
      value: JSON.parse(JSON.stringify(props.input)),
    };
    const raw: string[] = [];
    const setters: Map<string, Setter<string>> = new Map();
    visitCollection({
      filter: props.filter,
      container: {
        raw,
        setters,
      },
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

  const visitCollection = (next: {
    container: {
      raw: string[];
      setters: Map<string, Setter<string>>;
    };
    filter: JsonTranslator.IProps<any>["filter"];
    dictionary: Record<string, string> | null;
    set: Setter<any>;
    value: any;
    explore: Omit<JsonTranslator.IExplore, "value">;
  }): void => {
    if (typeof next.value === "string") {
      const text: string = next.value.trim().endsWith(".")
        ? next.value.trim().slice(0, -1)
        : next.value.trim();
      const endDot: boolean = next.value.trim().endsWith(".");
      const final = (str: string) => `${str}${endDot ? "." : ""}`;
      if (text.length === 0) return;
      else if (
        next.filter &&
        !next.filter({
          ...next.explore,
          value: final(text),
        })
      )
        return;
      else if (next.dictionary && typeof next.dictionary[text] === "string") {
        next.set(final(next.dictionary[text]));
        return;
      }
      const found: Setter<string> | undefined =
        next.container.setters.get(text);
      if (found !== undefined) {
        next.container.setters.set(text, (str) => {
          next.set(final(str));
          found(str);
        });
      } else {
        next.container.raw.push(text);
        next.container.setters.set(text, (str) => next.set(final(str)));
      }
    } else if (Array.isArray(next.value))
      next.value.forEach((elem, i) =>
        visitCollection({
          ...next,
          explore: {
            ...next.explore,
            accessor: [...next.explore.accessor, i.toString()],
            index: i,
          },
          set: (x) => (next.value[i] = x),
          value: elem,
        }),
      );
    else if (typeof next.value === "object" && next.value !== null)
      Object.entries(next.value).forEach(([key, elem]) =>
        visitCollection({
          ...next,
          explore: {
            ...next.explore,
            accessor: [...next.explore.accessor, key],
            object: next.value,
            key,
            index: null,
          },
          set: (x) => (next.value[key] = x),
          value: elem,
        }),
      );
  };

  /* -----------------------------------------------------------
    LIST UP TEXTS
  ----------------------------------------------------------- */
  export const composeTexts = (
    props: JsonTranslator.IDetectProps<any>,
  ): string[] => {
    const output: Set<string> = new Set();
    const visited: WeakSet<object> = new WeakSet();
    visitTexts({
      filter: props.filter,
      dictionary: props.dictionary ?? null,
      container: output,
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
    container: Set<string>;
    filter: JsonTranslator.IDetectProps<any>["filter"];
    dictionary: Record<string, string> | null;
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
      else next.container.add(next.value);
    } else if (
      Array.isArray(next.value) &&
      next.visited.has(next.value) === false
    ) {
      next.visited.add(next.value);
      next.value.forEach((elem, i) =>
        visitTexts({
          ...next,
          value: elem,
          explore: {
            ...next.explore,
            accessor: [...next.explore.accessor, i.toString()],
            index: i,
          },
        }),
      );
    } else if (
      typeof next.value === "object" &&
      next.value !== null &&
      Array.isArray(next.value) === false &&
      next.visited.has(next.value) === false
    ) {
      next.visited.add(next.value);
      Object.entries(next.value).forEach(([key, value]) =>
        visitTexts({
          ...next,
          explore: {
            ...next.explore,
            accessor: [...next.explore.accessor, key],
            object: next.value,
            key,
            index: null,
          },
          value,
        }),
      );
    }
  };

  /* -----------------------------------------------------------
    DICTIONARY FROM THE TRANSLATED
  ----------------------------------------------------------- */
  export const composeDictionary = (
    props: JsonTranslator.IDictionaryProps<any>,
  ): Record<string, string> => {
    const output: Record<string, string> = {};
    const visited: WeakSet<object> = new WeakSet();
    visitDictionary({
      filter: props.filter,
      container: output,
      input: props.input,
      output: props.output,
      visited,
      explore: {
        object: null,
        key: null,
        index: null,
        accessor: ["$input"],
      },
    });
    return output;
  };

  const visitDictionary = (next: {
    container: Record<string, string>;
    visited: WeakSet<object>;
    filter: JsonTranslator.IDictionaryProps<any>["filter"];
    input: any;
    output: any;
    explore: Omit<JsonTranslator.IExplore, "value">;
  }): void => {
    if (typeof next.input !== typeof next.output) return;
    else if (typeof next.input === "string") {
      if (next.input.trim().length === 0) return;
      else if (
        next.filter &&
        next.filter({
          ...next.explore,
          value: next.input,
        }) === false
      )
        return;
      next.container[next.input] = next.output as string;
    } else if (
      Array.isArray(next.input) &&
      Array.isArray(next.output) &&
      next.visited.has(next.input) === false
    ) {
      next.visited.add(next.input);
      next.input.forEach((x, i) =>
        visitDictionary({
          ...next,
          input: x,
          output: next.output[i],
          explore: {
            ...next.explore,
            accessor: [...next.explore.accessor, i.toString()],
            index: i,
          },
        }),
      );
    } else if (
      typeof next.input === "object" &&
      next.input !== null &&
      next.output !== null &&
      Array.isArray(next.input) === false &&
      next.visited.has(next.input) === false
    ) {
      next.visited.add(next.input);
      Object.entries(next.input).forEach(([key, x]) =>
        visitDictionary({
          ...next,
          input: x,
          output: next.output[key],
          explore: {
            ...next.explore,
            accessor: [...next.explore.accessor, key],
            object: next.input,
            key,
            index: null,
          },
        }),
      );
    }
  };
}
