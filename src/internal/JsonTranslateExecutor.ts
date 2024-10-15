import { JsonTranslator } from "../JsonTranslator";

/**
 * @internal
 */
export namespace JsonTranslateExecutor {
  export interface ICollection {
    output: any;
    raw: string[];
    setters: Array<Setter<string>>;
  }
  export type Setter<T> = (input: T) => void;

  export const prepare = (props: JsonTranslator.IProps<any>): ICollection => {
    const ptr = {
      value: JSON.parse(JSON.stringify(props.input)),
    };
    const raw: string[] = [];
    const dict: Map<string, Setter<string>> = new Map();
    visit({
      filter: props.filter,
      raw,
      dict,
      setter: (x) => (ptr.value = x),
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
      setters: Array.from(dict.values()),
    };
  };

  const visit = (next: {
    filter: JsonTranslator.IProps<any>["filter"];
    raw: string[];
    dict: Map<string, Setter<string>>;
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
      const found: Setter<string> | undefined = next.dict.get(next.value);
      if (found !== undefined) {
        next.dict.set(next.value, (str) => {
          next.setter(str);
          found(str);
        });
      } else {
        next.raw.push(next.value);
        next.dict.set(next.value, next.setter);
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
          setter: (x) => (next.value[i] = x),
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
          setter: (x) => (next.value[key] = x),
          value: elem,
        }),
      );
  };
}
