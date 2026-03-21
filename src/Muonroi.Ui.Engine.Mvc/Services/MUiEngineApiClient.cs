using System.Net.Http.Json;
using Muonroi.Ui.Engine.Mvc.Models;

namespace Muonroi.Ui.Engine.Mvc.Services;

/// <summary>
/// Provides typed access to the UI engine manifest endpoints.
/// </summary>
public sealed class MUiEngineApiClient
{
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="MUiEngineApiClient"/> class.
    /// </summary>
    /// <param name="httpClient">The HTTP client used to call the UI engine endpoints.</param>
    public MUiEngineApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <summary>
    /// Loads the UI manifest for the specified user identifier.
    /// </summary>
    public async Task<MUiEngineManifest?> MLoadByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _httpClient.GetFromJsonAsync<MUiEngineManifest>($"/api/v1/auth/ui-engine/{userId}", cancellationToken);
    }

    /// <summary>
    /// Loads the UI manifest for the current authenticated user.
    /// </summary>
    public async Task<MUiEngineManifest?> MLoadCurrentAsync(CancellationToken cancellationToken = default)
    {
        return await _httpClient.GetFromJsonAsync<MUiEngineManifest>("/api/v1/auth/ui-engine/current", cancellationToken);
    }
}
