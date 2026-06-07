import { parse } from "csv-parse";

export class CsvReaderUtil {
  static parseRecords = (csvContent: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const records: any[] = [];

      const csvParser = parse({
        delimiter: ";",
        skip_empty_lines: true,
        from_line: 2,
        trim: true,
      });

      csvParser.on("readable", function () {
        let record;
        while ((record = csvParser.read())) {
          records.push(record);
        }
      });

      csvParser.on("error", function (err) {
        reject(err);
      });

      csvParser.on("end", function () {
        resolve(records);
      });

      csvParser.write(csvContent);
      csvParser.end();
    });
  };
}
