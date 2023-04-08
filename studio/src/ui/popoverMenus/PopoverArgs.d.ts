import { UuidString } from "../../../../src/mod";
import { AssetManager } from "../../assets/AssetManager";
import { PreferencesManager } from "../../preferences/PreferencesManager";
import { ProjectSettingsManager } from "../../projectSelector/ProjectSettingsManager";
import { ContentWindowPersistentData } from "../../windowManagement/ContentWindowPersistentData";
import { PreferencesPopover } from "../../windowManagement/PreferencesPopover";
import { EntryPointPopover } from "../../windowManagement/contentWindows/ContentWindowBuildView/EntryPointPopover";

type PopoverConstructorArgs<T> = T extends PreferencesPopover ? {
  preferencesManager: PreferencesManager;
  preferenceIds: string[];
  buttonEl: HTMLElement;
  contentWindowUuid: UuidString;
} : T extends EntryPointPopover ? {
  projectSettingsManager: ProjectSettingsManager;
  assetManager: AssetManager
  persistentData: ContentWindowPersistentData
} : never;
