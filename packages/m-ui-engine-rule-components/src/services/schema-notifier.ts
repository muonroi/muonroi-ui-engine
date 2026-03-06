import { HubConnectionBuilder, HttpTransportType, LogLevel, type HubConnection } from "@microsoft/signalr";

export interface MSchemaNotifierOptions {
  hubUrl: string;
  accessTokenFactory?: () => string;
}

export type MSchemaChangedHandler = (schemaHash?: string) => void;

export class MSchemaNotifier {
  private readonly mConnection: HubConnection;

  constructor(options: MSchemaNotifierOptions) {
    this.mConnection = new HubConnectionBuilder()
      .withUrl(options.hubUrl, {
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        accessTokenFactory: options.accessTokenFactory
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
  }

  public async MStart(): Promise<void> {
    if (this.mConnection.state === "Connected" || this.mConnection.state === "Connecting") {
      return;
    }

    await this.mConnection.start();
  }

  public async MStop(): Promise<void> {
    if (this.mConnection.state === "Disconnected") {
      return;
    }

    await this.mConnection.stop();
  }

  public MOnSchemaChanged(handler: MSchemaChangedHandler): void {
    this.mConnection.on("schema-changed", (payload: { schemaHash?: string } | string | undefined) => {
      if (typeof payload === "string") {
        handler(payload);
        return;
      }

      handler(payload?.schemaHash);
    });
  }
}
