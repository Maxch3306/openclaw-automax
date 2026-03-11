import { invoke } from "@tauri-apps/api/core";

export interface GatewayStatus {
  running: boolean;
  port: number;
  pid: number | null;
}

export interface PlatformInfo {
  os: string;
  arch: string;
  home_dir: string;
  maxauto_dir: string;
}

export interface NodeStatus {
  available: boolean;
  version: string | null;
  path: string | null;
  source: string | null;
}

export interface OpenclawStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
}

export interface ConfigData {
  raw: string;
  path: string;
}

// Gateway
export const startGateway = (port?: number, bind?: string) =>
  invoke<GatewayStatus>("start_gateway", { port, bind });

export const stopGateway = () => invoke<string>("stop_gateway");

export const getGatewayStatus = () =>
  invoke<GatewayStatus>("gateway_status");

export const getGatewayToken = () =>
  invoke<string>("get_gateway_token");

// System
export const getPlatformInfo = () =>
  invoke<PlatformInfo>("get_platform_info");

export const checkNode = () => invoke<NodeStatus>("check_node");

export const checkOpenclaw = () =>
  invoke<OpenclawStatus>("check_openclaw");

// Setup
export const installNode = () => invoke<string>("install_node");

export const installOpenclaw = () =>
  invoke<string>("install_openclaw");

// Config
export const readConfig = () => invoke<ConfigData>("read_config");

export const writeConfig = (json: string) =>
  invoke<string>("write_config", { json });
