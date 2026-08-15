import { Generator } from "@tanstack/router-generator";
//#region src/generate.ts
async function generate(config, root) {
	try {
		await new Generator({
			config,
			root
		}).run();
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
//#endregion
export { generate };

//# sourceMappingURL=generate.js.map