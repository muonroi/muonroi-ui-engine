using System.Net;
using System.Net.Http.Json;
using Muonroi.Ui.Engine.Mvc.Models;
using Muonroi.Ui.Engine.Mvc.Services;
using Xunit;

namespace Muonroi.Ui.Engine.Mvc.Tests;

public sealed class MUiEngineApiClientTests
{
    [Fact]
    public async Task MLoadByUserIdAsync_Calls_User_Endpoint_And_Parses_Response()
    {
        Guid userId = Guid.NewGuid();
        MUiEngineManifest expected = new()
        {
            SchemaVersion = "v1",
            UserId = userId
        };

        RecordingHandler handler = new((request, cancellationToken) =>
        {
            Assert.Equal($"/api/v1/auth/ui-engine/{userId}", request.RequestUri!.PathAndQuery);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(expected)
            });
        });

        using HttpClient httpClient = CreateClient(handler);
        MUiEngineApiClient client = new(httpClient);

        MUiEngineManifest? actual = await client.MLoadByUserIdAsync(userId);

        Assert.NotNull(actual);
        Assert.Equal(expected.SchemaVersion, actual.SchemaVersion);
        Assert.Equal(expected.UserId, actual.UserId);
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task MLoadCurrentAsync_Calls_Current_Endpoint_And_Parses_Response()
    {
        MUiEngineManifest expected = new()
        {
            SchemaVersion = "v2",
            TenantId = "tenant-a"
        };

        RecordingHandler handler = new((request, cancellationToken) =>
        {
            Assert.Equal("/api/v1/auth/ui-engine/current", request.RequestUri!.PathAndQuery);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(expected)
            });
        });

        using HttpClient httpClient = CreateClient(handler);
        MUiEngineApiClient client = new(httpClient);

        MUiEngineManifest? actual = await client.MLoadCurrentAsync();

        Assert.NotNull(actual);
        Assert.Equal(expected.SchemaVersion, actual.SchemaVersion);
        Assert.Equal(expected.TenantId, actual.TenantId);
        Assert.Single(handler.Requests);
    }

    private static HttpClient CreateClient(HttpMessageHandler handler)
    {
        return new HttpClient(handler)
        {
            BaseAddress = new Uri("https://localhost")
        };
    }

    private sealed class RecordingHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responder) : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            return responder(request, cancellationToken);
        }
    }
}
