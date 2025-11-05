import { consola } from "consola";
import { colors } from "consola/utils";

export const logger = consola.withTag("eshi");

export const txtSuccess = (text: string) => colors.green(text);
export const txtInfo = (text: string) => colors.cyan(text);
export const txtBold = (text: string) => colors.bold(text);
export const txtGray = (text: string) => colors.gray(text);
