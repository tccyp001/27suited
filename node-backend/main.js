import { parseCSV } from "./csv.js";
import { parseLog } from "./logparser.js";
import { plotLog } from "./logplotter.js";

function main() {
  const argv = process.argv.slice(2);
  if (argv.length !== 1) {
    throw "expecting path to log file";
  }

  const arg = argv[0];
  const lines = parseCSV(arg).reverse();
  const data = parseLog(lines);
  const output = plotLog(data);
  console.log(output);
}

main();
