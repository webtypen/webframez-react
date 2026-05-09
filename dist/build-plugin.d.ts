export type WebframezBuildContext = {
  projectRoot: string;
  stagingDir: string;
  outDir: string;
  run: (binaryName: string, args: string[], envAdditions?: Record<string, string>) => Promise<number>;
};

export declare function createPlugin(): {
  name: string;
  buildAssets(context: WebframezBuildContext): Promise<void>;
  validateBuild(context: WebframezBuildContext): void;
};

export default createPlugin;
