Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("./_virtual/_rolldown/runtime.cjs");
const require_generate = require("./generate.cjs");
const require_watch = require("./watch.cjs");
let yargs = require("yargs");
yargs = require_runtime.__toESM(yargs, 1);
let yargs_helpers = require("yargs/helpers");
let _tanstack_router_generator = require("@tanstack/router-generator");
//#region src/index.ts
main();
function main() {
	(0, yargs.default)((0, yargs_helpers.hideBin)(process.argv)).scriptName("tsr").usage("$0 <cmd> [args]").command("generate", "Generate the routes for a project", async () => {
		await require_generate.generate((0, _tanstack_router_generator.getConfig)(), process.cwd());
	}).command("watch", "Continuously watch and generate the routes for a project", () => {
		require_watch.watch(process.cwd());
	}).help().argv;
}
//#endregion
exports.main = main;

//# sourceMappingURL=index.cjs.map