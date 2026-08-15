let _tanstack_router_generator = require("@tanstack/router-generator");
//#region src/generate.ts
async function generate(config, root) {
	try {
		await new _tanstack_router_generator.Generator({
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
exports.generate = generate;

//# sourceMappingURL=generate.cjs.map