import AssetLoaderTypeGenericStructure from "./AssetLoaderTypeGenericStructure.js";
import {StorageType} from "../../Util/BinaryComposer.js";
import ClusteredLightsConfig from "../../Rendering/ClusteredLightsConfig.js";

export default class AssetLoaderTypeClusteredLightsConfig extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "13194e5c-01e8-4ecc-b645-86626b9d5e4c";
	}

	static get binaryComposerOpts() {
		return {
			structure: {
				clusterCount: [StorageType.UINT32],
				maxLightsPerClusterPass: StorageType.UINT32,
			},
			nameIds: {
				clusterCount: 1,
				maxLightsPerClusterPass: 2,
			},
		};
	}

	async parseBuffer(buffer) {
		const data = await super.parseBuffer(buffer);
		return new ClusteredLightsConfig(data);
	}
}
