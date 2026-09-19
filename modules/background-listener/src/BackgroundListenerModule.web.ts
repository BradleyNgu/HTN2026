import { registerWebModule, NativeModule } from 'expo';

// BackgroundListenerModule is not available on the web platform.
class BackgroundListenerModule extends NativeModule<{}> {}

export default registerWebModule(BackgroundListenerModule, 'BackgroundListenerModule');
