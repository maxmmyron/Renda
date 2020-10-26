import ProjectAssetType from "./ProjectAssetType.js";
import PropertiesAssetContentMaterialMap from "../../PropertiesAssetContent/PropertiesAssetContentMaterialMap.js";
import editor from "../../editorInstance.js";

export default class ProjectAssetTypeMaterialMap extends ProjectAssetType{

	static type = "JJ:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterialMap;

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
	}
}
