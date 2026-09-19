// Re-export the native module. On web, it will be resolved to BackgroundListenerModule.web.ts
// and on native platforms to BackgroundListenerModule.ts
export { default } from './src/BackgroundListenerModule';
export * from './src/BackgroundListener.types';
