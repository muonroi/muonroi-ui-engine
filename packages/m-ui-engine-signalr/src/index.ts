import * as signalR from "@microsoft/signalr";
import type { MUiEngineSchemaChangedEvent, MUiEngineSchemaWatcher } from "@muonroi/ui-engine-core";

export class MUiEngineSignalRSchemaWatcher implements MUiEngineSchemaWatcher {
  constructor(
    private readonly mHubUrl: string,
    private readonly mGetAccessToken?: () => string | null,
    private readonly mGetTenantId?: () => string | null
  ) {}

  public MSubscribe(onChanged: (event: MUiEngineSchemaChangedEvent) => void): () => void {
    const builder = new signalR.HubConnectionBuilder()
      .withUrl(this.mHubUrl, {
        accessTokenFactory: () => this.mGetAccessToken?.() ?? "",
        headers: this.mGetTenantId
          ? {
              "X-Tenant-Id": this.mGetTenantId() ?? ""
            }
          : undefined
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning);

    const connection = builder.build();

    connection.on("SchemaChanged", (schemaHash?: string, schemaVersion?: { schemaHash?: string }) => {
      onChanged({
        schemaHash: schemaVersion?.schemaHash ?? schemaHash
      });
    });

    connection
      .start()
      .then(() => connection.invoke("SubscribeToSchemaChanges"))
      .catch((error: unknown) => {
        console.error("Failed to start UI engine schema watcher", error);
      });

    return () => {
      void connection.invoke("UnsubscribeFromSchemaChanges").catch(() => undefined);
      void connection.stop().catch(() => undefined);
    };
  }
}
