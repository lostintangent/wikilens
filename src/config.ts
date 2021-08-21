import { workspace } from "vscode";
import { EXTENSION_NAME } from "./constants";

function getConfigSetting(settingName: string, defaultValue?: string) {
  return workspace
    .getConfiguration(EXTENSION_NAME)
    .get(settingName, defaultValue);
}

export const config = {
  get dailyDirectName() {
    return getConfigSetting("daily.directoryName");
  },
  get dailyTitleFormat() {
    return getConfigSetting("daily.titleFormat", "LL");
  },
};
