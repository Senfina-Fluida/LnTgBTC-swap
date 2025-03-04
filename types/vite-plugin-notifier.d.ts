// types/vite-plugin-notifier.d.ts
declare module 'vite-plugin-notifier' {
    import { Plugin } from 'vite';
  
    interface NotifierOptions {
      // Define the options for the plugin if you know them
      // Example:
      title?: string;
      message?: string;
      icon?: string;
    }
  
    const notifier: (options?: NotifierOptions) => Plugin;
    export default notifier;
  }