import { DynamicExecutor } from "@nestia/e2e";
import { JsonTranslator } from "@samchon/json-translator";
import chalk from "chalk";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

const EXTENSION = __filename.substring(0, __filename.length - 2);
if (EXTENSION === "js") require("source-map-support").install();

const getArguments = (type: string): string[] => {
  const from: number = process.argv.indexOf(`--${type}`) + 1;
  if (from === 0) return [];
  const to: number = process.argv
    .slice(from)
    .findIndex((str) => str.startsWith("--"), from);
  return process.argv.slice(from, to === -1 ? process.argv.length : to + from);
};

const main = async (): Promise<void> => {
  // PREPARE ASSETS
  dotenvExpand.expand(dotenv.config());
  const translator: JsonTranslator = new JsonTranslator({
    credentials: JSON.parse(process.env.CREDENTIALS ?? "{}"),
  });

  // DO TEST
  const include: string[] = getArguments("include");
  const exclude: string[] = getArguments("exclude");
  const report: DynamicExecutor.IReport = await DynamicExecutor.validate({
    prefix: "test_",
    location: __dirname + "/features",
    parameters: () => [translator],
    onComplete: (exec) => {
      const trace = (str: string) =>
        console.log(`  - ${chalk.green(exec.name)}: ${str}`);
      if (exec.error === null) {
        const elapsed: number =
          new Date(exec.completed_at).getTime() -
          new Date(exec.started_at).getTime();
        trace(`${chalk.yellow(elapsed.toLocaleString())} ms`);
      } else trace(chalk.red(exec.error.name));
    },
    filter: (name) =>
      (include.length ? include.some((str) => name.includes(str)) : true) &&
      (exclude.length ? exclude.every((str) => !name.includes(str)) : true),
  });

  // REPORT EXCEPTIONS
  const exceptions: Error[] = report.executions
    .filter((exec) => exec.error !== null)
    .map((exec) => exec.error!);
  if (exceptions.length === 0) {
    console.log("Success");
    console.log("Elapsed time", report.time.toLocaleString(), `ms`);
  } else {
    for (const exp of exceptions) console.log(exp);
    console.log("Failed");
    console.log("Elapsed time", report.time.toLocaleString(), `ms`);
  }
  if (exceptions.length) process.exit(-1);
};
main().catch(console.error);
