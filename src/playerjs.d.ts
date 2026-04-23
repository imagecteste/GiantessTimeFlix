declare module 'player.js' {
  interface PlayerInstance {
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
  }

  interface PlayerJsModule {
    Player: new (element: HTMLIFrameElement | string) => PlayerInstance;
  }

  const playerjs: PlayerJsModule;
  export default playerjs;
}
