export interface ElizaRuntime {
    agentWallet?: string;
    getSetting(key: string): string | undefined;
}
export interface ElizaMessage {
    content?: {
        text?: string;
    };
}
export interface ElizaAction {
    name: string;
    [key: string]: unknown;
}
export interface ElizaActionResult {
    success: boolean;
    amount?: number;
    [key: string]: unknown;
}
export interface ElizaPlugin {
    name: string;
    description: string;
    actions: ElizaActionDefinition[];
    onActionExecuted?: (runtime: ElizaRuntime, action: ElizaAction, result: ElizaActionResult) => Promise<void>;
}
export interface ElizaActionDefinition {
    name: string;
    description: string;
    handler: (runtime: ElizaRuntime, message?: ElizaMessage) => Promise<string>;
}
export declare const agentIdPlugin: ElizaPlugin;
export type { AgentIdentity, ActionType, AnchorWallet } from "@agentid/sdk";
export { PROGRAM_ID, DEVNET_RPC } from "@agentid/sdk";
//# sourceMappingURL=index.d.ts.map