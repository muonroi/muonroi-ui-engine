using Muonroi.Ui.Engine.Mvc.Models;
using Xunit;

namespace Muonroi.Ui.Engine.Mvc.Tests;

public sealed class MUiEngineManifestTests
{
    [Fact]
    public void Manifest_Default_Collections_Are_Initialized()
    {
        MUiEngineManifest manifest = new();

        Assert.NotNull(manifest.NavigationGroups);
        Assert.NotNull(manifest.Screens);
        Assert.NotNull(manifest.Actions);
        Assert.NotNull(manifest.DataSources);
        Assert.Empty(manifest.NavigationGroups);
        Assert.Empty(manifest.Screens);
        Assert.Empty(manifest.Actions);
        Assert.Empty(manifest.DataSources);
        Assert.Null(manifest.ComponentRegistry);
    }

    [Fact]
    public void ComponentDescriptor_Defaults_To_Lazy_Loaded()
    {
        MUiEngineComponentDescriptor descriptor = new();

        Assert.True(descriptor.IsLazyLoaded);
        Assert.Equal(string.Empty, descriptor.ComponentType);
        Assert.Equal(string.Empty, descriptor.BundleUrl);
        Assert.Equal(string.Empty, descriptor.RequiredTier);
        Assert.Null(descriptor.CssUrl);
        Assert.Null(descriptor.CustomElementTag);
    }

    [Fact]
    public void ComponentRegistry_Defaults_To_Empty_Dictionary()
    {
        MUiEngineComponentRegistry registry = new();

        Assert.NotNull(registry.Components);
        Assert.Empty(registry.Components);
    }
}
