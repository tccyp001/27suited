import {parse} from "csv-parse/sync";
import fs from "fs";

export function parseCSV(filename) {
  const buf = fs.readFileSync(filename);
  return parse(buf, {
    columns: true,
    skip_empty_lines: true
  });
}

