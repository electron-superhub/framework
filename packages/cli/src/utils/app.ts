import { z } from "zod";

import { AppInfo } from "@esho/core/types";

import { ActResult } from "./types";

const appInfoSchema = z.object({
  appId: z.string().meta({ description: "应用Id" }),
  name: z.string().meta({ description: "应用英文名称" }),
  productName: z.string().meta({ description: "应用中文名称" }),
  description: z.string().meta({ description: "应用描述" }),
  version: z.string().meta({ description: "版本号" }),
  author: z.object({
    name: z.string().meta({ description: "作者名称" }),
    email: z.email().meta({ description: "作者邮箱" }),
    url: z.url().meta({ description: "作者主页" }),
  }),
  homepage: z.url().meta({ description: "应用主页" }),
  copyright: z.string().meta({ description: "版权信息" }),
  windows: z.object({
    main: z.object({
      prod_url: z.string().meta({ description: "生产环境页面地址" }),
      dev_url: z.string().meta({ description: "开发环境页面地址" }).optional(),
    }),
  }),
  protocol: z.object({
    scheme: z.string().meta({ description: "唤醒协议" }),
  }),
  publish: z.object({
    base_url: z.string().meta({ description: "发布base地址" }),
  }),
  plugins: z.object({
    publish: z.object({
      base_url: z.string().meta({ description: "插件发布base地址" }),
    }),
  }),
});

export function validateAppInfo(appInfo: AppInfo): ActResult {
  const result = appInfoSchema.safeParse(appInfo);

  if (result.success) return { success: true };

  return {
    success: false,
    errorMsg: z.prettifyError(result.error),
  };
}
