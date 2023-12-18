const log4js = require("log4js");

log4js.configure({
  appenders: { 
    out: { type: "stdout" },
    app: { type: "dateFile", filename: "logs/application.log" }, 
    },
  categories: { default: { appenders: ["out", "app"], level: "debug" } },
});

const logger = log4js.getLogger();
module.exports = logger;