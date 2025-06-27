import { AppContext } from "./context";

export interface AppModule {
  init(context: AppContext): Promise<void> | void;
}
