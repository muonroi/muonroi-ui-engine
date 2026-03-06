namespace Muonroi.Ui.Engine.Mvc.Models;

public sealed class MUiEngineManifest
{
    public string SchemaVersion { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; }
    public Guid UserId { get; set; }
    public string? TenantId { get; set; }
    public List<MUiEngineNavigationGroup> NavigationGroups { get; set; } = [];
    public List<MUiEngineScreen> Screens { get; set; } = [];
    public List<MUiEngineAction> Actions { get; set; } = [];
    public List<MUiEngineDataSource> DataSources { get; set; } = [];
    public MUiEngineComponentRegistry? ComponentRegistry { get; set; }
}

public sealed class MUiEngineNavigationGroup
{
    public string GroupName { get; set; } = string.Empty;
    public string GroupDisplayName { get; set; } = string.Empty;
    public List<MUiEngineNavigationNode> Items { get; set; } = [];
}

public sealed class MUiEngineNavigationNode
{
    public string NodeKey { get; set; } = string.Empty;
    public string UiKey { get; set; } = string.Empty;
    public string? ParentUiKey { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public int Order { get; set; }
    public bool IsVisible { get; set; }
    public bool IsEnabled { get; set; }
    public string? DisabledReason { get; set; }
    public string? ScreenKey { get; set; }
    public List<string> ActionKeys { get; set; } = [];
    public List<MUiEngineNavigationNode> Children { get; set; } = [];
}

public sealed class MUiEngineScreen
{
    public string ScreenKey { get; set; } = string.Empty;
    public string UiKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public bool IsVisible { get; set; }
    public bool IsEnabled { get; set; }
    public string? DisabledReason { get; set; }
    public string? DataSourceKey { get; set; }
    public List<string> ActionKeys { get; set; } = [];
    public List<MUiEngineComponent> Components { get; set; } = [];
}

public sealed class MUiEngineComponent
{
    public string ComponentKey { get; set; } = string.Empty;
    public string UiKey { get; set; } = string.Empty;
    public string ScreenKey { get; set; } = string.Empty;
    public string ComponentType { get; set; } = string.Empty;
    public string Slot { get; set; } = string.Empty;
    public int Order { get; set; }
    public Dictionary<string, string> Props { get; set; } = [];
}

public sealed class MUiEngineAction
{
    public string ActionKey { get; set; } = string.Empty;
    public string UiKey { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public bool IsVisible { get; set; }
    public bool IsEnabled { get; set; }
    public string? DisabledReason { get; set; }
    public string? TargetScreenKey { get; set; }
}

public sealed class MUiEngineDataSource
{
    public string DataSourceKey { get; set; } = string.Empty;
    public string UiKey { get; set; } = string.Empty;
    public string ScreenKey { get; set; } = string.Empty;
    public string EndpointPath { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = string.Empty;
    public string? RequestModel { get; set; }
    public string? ResponseModel { get; set; }
}

public sealed class MUiEngineComponentRegistry
{
    public Dictionary<string, MUiEngineComponentDescriptor> Components { get; set; } = [];
}

public sealed class MUiEngineComponentDescriptor
{
    public string ComponentType { get; set; } = string.Empty;
    public string BundleUrl { get; set; } = string.Empty;
    public string? CssUrl { get; set; }
    public string? CustomElementTag { get; set; }
    public bool IsLazyLoaded { get; set; } = true;
    public string RequiredTier { get; set; } = string.Empty;
}
