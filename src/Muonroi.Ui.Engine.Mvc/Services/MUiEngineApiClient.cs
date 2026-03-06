using System.Net.Http.Json;
using Muonroi.Ui.Engine.Mvc.Models;

namespace Muonroi.Ui.Engine.Mvc.Services;

public sealed class MUiEngineApiClient(HttpClient httpClient)
{
    public async Task<MUiEngineManifest?> MLoadByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await httpClient.GetFromJsonAsync<MUiEngineManifest>($"/api/v1/auth/ui-engine/{userId}", cancellationToken);
    }

    public async Task<MUiEngineManifest?> MLoadCurrentAsync(CancellationToken cancellationToken = default)
    {
        return await httpClient.GetFromJsonAsync<MUiEngineManifest>("/api/v1/auth/ui-engine/current", cancellationToken);
    }
}