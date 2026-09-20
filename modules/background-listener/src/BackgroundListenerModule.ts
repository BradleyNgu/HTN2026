import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  BackgroundListenerEvents,
  BackgroundListenerOptions,
  BackgroundListenerStatus,
} from "./BackgroundListener.types";

declare class BackgroundListenerModule extends NativeModule<BackgroundListenerEvents> {
  start(options: BackgroundListenerOptions): BackgroundListenerStatus;
  stop(): boolean;
  dismissTornadoAlert(): boolean;
  getStatus(): BackgroundListenerStatus;
}

export default requireOptionalNativeModule<BackgroundListenerModule>(
  "BackgroundListener",
);
