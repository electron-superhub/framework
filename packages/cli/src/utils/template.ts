import { Eta } from "eta";

import tpl_eshoConfig from "#virtual/templates/esho-config";
import tpl_linux_afterInstall from "#virtual/templates/installer/linux/after-install";
import tpl_linux_afterRemove from "#virtual/templates/installer/linux/after-remove";
import tpl_win_nsisInstaller from "#virtual/templates/installer/win/nsis-installer";

const eta = new Eta({ tags: ["@@{", "}"] });

function renderTemplate(tplStr: string, data: Record<string, any>) {
  return eta.renderString(tplStr, data);
}

export function renderEshoConfig(data: Record<string, any>) {
  return renderTemplate(tpl_eshoConfig, data);
}

export function renderLinuxAfterInstall(data: Record<string, any>) {
  return renderTemplate(tpl_linux_afterInstall, data);
}

export function renderLinuxAfterRemove(data: Record<string, any>) {
  return renderTemplate(tpl_linux_afterRemove, data);
}

export function renderWinNsisInstaller(data: Record<string, any>) {
  return renderTemplate(tpl_win_nsisInstaller, data);
}
