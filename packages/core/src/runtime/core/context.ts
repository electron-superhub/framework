import { AppRuntimeContext } from "../types";
import { isPlainObject } from "../utils";

export class DefaultAppRuntimeContext implements AppRuntimeContext {
  private readonly runtimeInfoMap: Record<string, {}>;

  constructor() {
    this.runtimeInfoMap = Object.create(null);
  }

  setRuntimeInfo(key: string, value: Record<string, any>) {
    if (key) {
      this.runtimeInfoMap[key] = value;
    }
  }

  updateRuntimeInfo(key: string, value: Record<string, any>) {
    if (key) {
      this.runtimeInfoMap[key] = {
        ...(this.runtimeInfoMap[key] ?? {}),
        ...(value ?? {}),
      };
    }
  }

  getRuntimeInfo(key: string): Record<string, any> {
    if (key) {
      return this.runtimeInfoMap[key] ?? {};
    }

    throw new Error("invalid key");
  }

  hasRuntimeInfo(key: string) {
    if (!key) return false;

    return this.runtimeInfoMap[key] !== undefined;
  }

  getRuntimeInfoKeys() {
    return Object.keys(this.runtimeInfoMap);
  }

  getRuntimeInfoSubValue(key: string, subPaths: string[]) {
    subPaths ??= [];
    const filterSubPaths = subPaths.filter((subPath) => !!subPath);

    if (key && filterSubPaths.length > 0) {
      filterSubPaths.unshift(key); // 在数组头部加上key

      return filterSubPaths.reduce<any>((preValue, curPath) => {
        if (isPlainObject(preValue)) {
          return preValue[curPath];
        }
      }, this.runtimeInfoMap);
    }
  }

  updateRuntimeInfoSubValue(
    key: string,
    subPaths: string[],
    value: Record<string, any>
  ) {
    subPaths ??= [];
    const filterSubPaths = subPaths.filter((subPath) => !!subPath);

    if (key && filterSubPaths.length > 0) {
      const lastSubPath = filterSubPaths.pop()!; // 移除最后一个subPath
      filterSubPaths.unshift(key); // 在数组头部加上key

      // 遍历subPaths 获取 倒数第二个Path对应的runtimeInfo
      const nextToLastRuntimeInfo = filterSubPaths.reduce<any>(
        (preValue, curPath) => {
          if (isPlainObject(preValue)) {
            return (preValue[curPath] ??= {});
          }
        },
        this.runtimeInfoMap
      );

      if (isPlainObject(nextToLastRuntimeInfo)) {
        nextToLastRuntimeInfo[lastSubPath] = {
          ...(nextToLastRuntimeInfo[lastSubPath] ?? {}),
          ...(value ?? {}),
        };
      }
    }
  }

  static addExtensionMethod<TArgs extends any[], TReturn>(
    name: string,
    func: (this: DefaultAppRuntimeContext, ...args: TArgs) => TReturn
  ) {
    // 把扩展方法挂到原型上
    (DefaultAppRuntimeContext.prototype as any)[name] = func;
  }
}
