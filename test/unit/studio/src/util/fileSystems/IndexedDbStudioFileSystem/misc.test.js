import {createBasicFs, createFs, forcePendingOperations} from "./shared.js";
import {assertEquals, assertExists} from "std/testing/asserts.ts";

Deno.test({
	name: "assertDbExists() should throw after using deleteDb()",
	fn: async () => {
		const fs = await createFs();
		await fs.deleteDb();

		let didThrow = false;
		try {
			fs.assertDbExists();
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);

		await fs.waitForRootCreate();
	},
});

Deno.test({
	name: "waitForRootCreate() should resolve",
	fn: async () => {
		const fs = await createFs();
		await fs.waitForRootCreate();
		await fs.waitForRootCreate();
	},
});

Deno.test({
	name: "createDir() the same path twice at the same time shouldn't create extra entries",
	async fn() {
		const {fs, getEntryCount} = await createBasicFs();
		const originalEntryCount = getEntryCount();
		const promise1 = fs.createDir(["root", "created", "dir1"]);
		const promise2 = fs.createDir(["root", "created", "dir1"]);
		await promise1;
		await promise2;

		const newEntryCount = getEntryCount();
		assertEquals(newEntryCount, originalEntryCount + 2);
	},
});

Deno.test({
	name: "Multiple writeFile() calls run in sequence",
	async fn() {
		const {fs, getEntryCount} = await createBasicFs({
			disableStructuredClone: true,
		});
		const originalEntryCount = getEntryCount();
		assertExists(fs.db);
		const originalGet = fs.db.get.bind(fs.db);
		let currentlyRunningCalls = 0;
		fs.db.get = async function(key, objectStoreName) {
			currentlyRunningCalls++;
			if (currentlyRunningCalls > 1) {
				throw new Error("More than one get call running at a time");
			}
			const result = await originalGet(key, objectStoreName);
			currentlyRunningCalls--;
			return /** @type {any} */ (result);
		};

		forcePendingOperations(true);
		const promises = [];
		for (let i = 0; i < 10; i++) {
			const promise = fs.writeFile(["root", "file1"], "hello" + i);
			promises.push(promise);
			// await promise;
		}
		forcePendingOperations(false);
		await Promise.all(promises);

		const result = await fs.readText(["root", "file1"]);
		assertEquals(result, "hello9");

		const newEntryCount = getEntryCount();
		assertEquals(newEntryCount, originalEntryCount);
	},
});
