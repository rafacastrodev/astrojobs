const require_runtime = require("./_virtual/_rolldown/runtime.cjs");
let _tanstack_router_generator = require("@tanstack/router-generator");
let chokidar = require("chokidar");
chokidar = require_runtime.__toESM(chokidar, 1);
//#region src/watch.ts
function watch(root) {
	const configPath = (0, _tanstack_router_generator.resolveConfigPath)({ configDirectory: root });
	const configWatcher = chokidar.default.watch(configPath);
	let watcher = new chokidar.default.FSWatcher({});
	const generatorWatcher = () => {
		const config = (0, _tanstack_router_generator.getConfig)();
		const generator = new _tanstack_router_generator.Generator({
			config,
			root
		});
		watcher.close();
		console.info(`TSR: Watching routes (${config.routesDirectory})...`);
		watcher = chokidar.default.watch(config.routesDirectory);
		watcher.on("ready", async () => {
			const handle = async () => {
				try {
					await generator.run();
				} catch (err) {
					console.error(err);
					console.info();
				}
			};
			await handle();
			watcher.on("all", (event, path) => {
				let type;
				switch (event) {
					case "add":
						type = "create";
						break;
					case "change":
						type = "update";
						break;
					case "unlink":
						type = "delete";
						break;
				}
				if (type) return generator.run({
					path,
					type
				});
				return generator.run();
			});
		});
	};
	configWatcher.on("ready", generatorWatcher);
	configWatcher.on("change", generatorWatcher);
}
//#endregion
exports.watch = watch;

//# sourceMappingURL=watch.cjs.map