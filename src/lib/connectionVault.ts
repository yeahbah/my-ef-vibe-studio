import { LazyStore } from "@tauri-apps/plugin-store";
import type { EfvibeWorkspace, WorkspaceConnection } from "../types/workspace";

const vaultStore = new LazyStore("connection-vault.json");

function vaultKey(workspacePath: string, connectionId: string): string {
  const workspaceKey = workspacePath.trim() || "unsaved-workspace";
  return `${workspaceKey}::${connectionId}`;
}

export async function getVaultedConnectionString(
  workspacePath: string,
  connectionId: string,
): Promise<string | undefined> {
  return vaultStore.get<string>(vaultKey(workspacePath, connectionId));
}

export async function setVaultedConnectionString(
  workspacePath: string,
  connectionId: string,
  connectionString: string,
): Promise<void> {
  const key = vaultKey(workspacePath, connectionId);

  if (!connectionString.trim()) {
    await vaultStore.delete(key);
  } else {
    await vaultStore.set(key, connectionString);
  }

  await vaultStore.save();
}

export async function deleteVaultedConnectionString(
  workspacePath: string,
  connectionId: string,
): Promise<void> {
  await vaultStore.delete(vaultKey(workspacePath, connectionId));
  await vaultStore.save();
}

export function stripConnectionSecretsForSave(workspace: EfvibeWorkspace): EfvibeWorkspace {
  return {
    ...workspace,
    connections: workspace.connections.map((connection) => ({
      ...connection,
      connectionString: undefined,
    })),
  };
}

export async function hydrateWorkspaceSecrets(
  workspacePath: string,
  workspace: EfvibeWorkspace,
): Promise<EfvibeWorkspace> {
  const connections = await Promise.all(
    workspace.connections.map(async (connection) => hydrateConnection(workspacePath, connection)),
  );

  return {
    ...workspace,
    connections,
  };
}

async function hydrateConnection(
  workspacePath: string,
  connection: WorkspaceConnection,
): Promise<WorkspaceConnection> {
  if (connection.connectionString?.trim()) {
    return connection;
  }

  const vaulted = await getVaultedConnectionString(workspacePath, connection.id);
  if (!vaulted) {
    return connection;
  }

  return {
    ...connection,
    connectionString: vaulted,
  };
}

export async function syncConnectionSecretToVault(
  workspacePath: string,
  connection: WorkspaceConnection,
  vaultEnabled: boolean,
): Promise<WorkspaceConnection> {
  const connectionString = connection.connectionString?.trim() ?? "";

  if (!vaultEnabled) {
    if (connectionString) {
      return connection;
    }

    await deleteVaultedConnectionString(workspacePath, connection.id);
    return connection;
  }

  await setVaultedConnectionString(workspacePath, connection.id, connectionString);

  return {
    ...connection,
    connectionString,
  };
}
