import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  BackgroundListenerEvents,
  BackgroundListenerOptions,
  BackgroundListenerStatus,
  PendingBackgroundTrigger,
} from "./BackgroundListener.types";

declare class BackgroundListenerModule extends NativeModule<BackgroundListenerEvents> {
  start(options: BackgroundListenerOptions): BackgroundListenerStatus;
  stop(): boolean;
  getStatus(): BackgroundListenerStatus;
  consumePendingTrigger(): PendingBackgroundTrigger | null;
}

export default requireOptionalNativeModule<BackgroundListenerModule>(
  "BackgroundListener",
);
