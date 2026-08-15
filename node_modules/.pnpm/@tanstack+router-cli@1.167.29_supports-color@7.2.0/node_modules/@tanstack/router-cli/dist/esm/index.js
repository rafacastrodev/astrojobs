import { generate } from "./generate.js";
import { watch } from "./watch.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getConfig } from "@tanstack/router-generator";
//#region src/index.ts
main();
function main() {
	yargs(hideBin(process.argv)).scriptName("tsr").usage("$0 <cmd> [args]").command("generate", "Generate the routes for a project", async () => {
		await generate(getConfig(), process.cwd());
	}).command("watch", "Continuously watch and generate the routes for a project", () => {
		watch(process.cwd());
	}).help().argv;
}
//#endregion
export { main };

//# sourceMappingURL=index.js.map