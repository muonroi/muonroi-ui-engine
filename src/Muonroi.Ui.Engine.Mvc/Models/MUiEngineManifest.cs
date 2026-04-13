namespace Muonroi.Ui.Engine.Mvc.Models;

/// <summary>
/// Represents the serialized UI engine manifest returned to MVC clients.
/// </summary>
public sealed class MUiEngineManifest
{
    /// <summary>
    /// Gets or sets the manifest schema version.
    /// </summary>
    public string SchemaVersion { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the UTC timestamp when the manifest was generated.
    /// </summary>
    public DateTime GeneratedAtUtc { get; set; }
    /// <summary>
    /// Gets or sets the user identifier the manifest was generated for.
    /// </summary>
    public Guid UserId { get; set; }
    /// <summary>
    /// Gets or sets the tenant identifier associated with the manifest.
    /// </summary>
    public string? TenantId { get; set; }
    /// <summary>
    /// Gets or sets the top-level navigation groups.
    /// </summary>
    public List<MUiEngineNavigationGroup> NavigationGroups { get; set; } = [];
    /// <summary>
    /// Gets or sets the screens available in the manifest.
    /// </summary>
    public List<MUiEngineScreen> Screens { get; set; } = [];
    /// <summary>
    /// Gets or sets the actions available in the manifest.
    /// </summary>
    public List<MUiEngineAction> Actions { get; set; } = [];
    /// <summary>
    /// Gets or sets the data sources referenced by the manifest.
    /// </summary>
    public List<MUiEngineDataSource> DataSources { get; set; } = [];
    /// <summary>
    /// Gets or sets the client component registry metadata.
    /// </summary>
    public MUiEngineComponentRegistry? ComponentRegistry { get; set; }
}

/// <summary>
/// Represents a logical navigation group in the manifest.
/// </summary>
public sealed class MUiEngineNavigationGroup
{
    /// <summary>
    /// Gets or sets the internal group key.
    /// </summary>
    public string GroupName { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the display name shown to end users.
    /// </summary>
    public string GroupDisplayName { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the navigation items in the group.
    /// </summary>
    public List<MUiEngineNavigationNode> Items { get; set; } = [];
}

/// <summary>
/// Represents a single node in the navigation tree.
/// </summary>
public sealed class MUiEngineNavigationNode
{
    /// <summary>
    /// Gets or sets the unique navigation node key.
    /// </summary>
    public string NodeKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the UI key associated with the node.
    /// </summary>
    public string UiKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the parent UI key when the node is nested.
    /// </summary>
    public string? ParentUiKey { get; set; }
    /// <summary>
    /// Gets or sets the navigation title.
    /// </summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the navigation route.
    /// </summary>
    public string Route { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the navigation node type.
    /// </summary>
    public string Type { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the optional icon identifier.
    /// </summary>
    public string? Icon { get; set; }
    /// <summary>
    /// Gets or sets the display order within the parent collection.
    /// </summary>
    public int Order { get; set; }
    /// <summary>
    /// Gets or sets a value indicating whether the node is visible.
    /// </summary>
    public bool IsVisible { get; set; }
    /// <summary>
    /// Gets or sets a value indicating whether the node is enabled.
    /// </summary>
    public bool IsEnabled { get; set; }
    /// <summary>
    /// Gets or sets the reason the node is disabled.
    /// </summary>
    public string? DisabledReason { get; set; }
    /// <summary>
    /// Gets or sets the target screen key for the node.
    /// </summary>
    public string? ScreenKey { get; set; }
    /// <summary>
    /// Gets or sets the action keys associated with the node.
    /// </summary>
    public List<string> ActionKeys { get; set; } = [];
    /// <summary>
    /// Gets or sets the nested child nodes.
    /// </summary>
    public List<MUiEngineNavigationNode> Children { get; set; } = [];
}

/// <summary>
/// Represents a renderable screen definition in the manifest.
/// </summary>
public sealed class MUiEngineScreen
{
    /// <summary>
    /// Gets or sets the unique screen key.
    /// </summary>
    public string ScreenKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the UI key associated with the screen.
    /// </summary>
    public string UiKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the screen title.
    /// </summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the route used to navigate to the screen.
    /// </summary>
    public string Route { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets a value indicating whether the screen is visible.
    /// </summary>
    public bool IsVisible { get; set; }
    /// <summary>
    /// Gets or sets a value indicating whether the screen is enabled.
    /// </summary>
    public bool IsEnabled { get; set; }
    /// <summary>
    /// Gets or sets the reason the screen is disabled.
    /// </summary>
    public string? DisabledReason { get; set; }
    /// <summary>
    /// Gets or sets the data source key backing the screen.
    /// </summary>
    public string? DataSourceKey { get; set; }
    /// <summary>
    /// Gets or sets the action keys available on the screen.
    /// </summary>
    public List<string> ActionKeys { get; set; } = [];
    /// <summary>
    /// Gets or sets the components rendered on the screen.
    /// </summary>
    public List<MUiEngineComponent> Components { get; set; } = [];
}

/// <summary>
/// Represents a single UI component instance on a screen.
/// </summary>
public sealed class MUiEngineComponent
{
    /// <summary>
    /// Gets or sets the unique component key.
    /// </summary>
    public string ComponentKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the UI key associated with the component.
    /// </summary>
    public string UiKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the screen key the component belongs to.
    /// </summary>
    public string ScreenKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the registered component type.
    /// </summary>
    public string ComponentType { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the layout slot for the component.
    /// </summary>
    public string Slot { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the display order within the slot.
    /// </summary>
    public int Order { get; set; }
    /// <summary>
    /// Gets or sets the component properties serialized as key/value pairs.
    /// </summary>
    public Dictionary<string, string> Props { get; set; } = [];
}

/// <summary>
/// Represents an action exposed by the UI manifest.
/// </summary>
public sealed class MUiEngineAction
{
    /// <summary>
    /// Gets or sets the unique action key.
    /// </summary>
    public string ActionKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the UI key associated with the action.
    /// </summary>
    public string UiKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the permission required for the action.
    /// </summary>
    public string PermissionName { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the action label.
    /// </summary>
    public string Label { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the action route.
    /// </summary>
    public string Route { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the action type.
    /// </summary>
    public string ActionType { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets a value indicating whether the action is visible.
    /// </summary>
    public bool IsVisible { get; set; }
    /// <summary>
    /// Gets or sets a value indicating whether the action is enabled.
    /// </summary>
    public bool IsEnabled { get; set; }
    /// <summary>
    /// Gets or sets the reason the action is disabled.
    /// </summary>
    public string? DisabledReason { get; set; }
    /// <summary>
    /// Gets or sets the target screen key for navigation actions.
    /// </summary>
    public string? TargetScreenKey { get; set; }
}

/// <summary>
/// Represents a backend data source referenced by the UI.
/// </summary>
public sealed class MUiEngineDataSource
{
    /// <summary>
    /// Gets or sets the unique data source key.
    /// </summary>
    public string DataSourceKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the UI key associated with the data source.
    /// </summary>
    public string UiKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the screen key the data source belongs to.
    /// </summary>
    public string ScreenKey { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the endpoint path used to load data.
    /// </summary>
    public string EndpointPath { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the HTTP method used to call the endpoint.
    /// </summary>
    public string HttpMethod { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the request model type name.
    /// </summary>
    public string? RequestModel { get; set; }
    /// <summary>
    /// Gets or sets the response model type name.
    /// </summary>
    public string? ResponseModel { get; set; }
}

/// <summary>
/// Represents the client-side component registry.
/// </summary>
public sealed class MUiEngineComponentRegistry
{
    /// <summary>
    /// Gets or sets the registered component descriptors by component type.
    /// </summary>
    public Dictionary<string, MUiEngineComponentDescriptor> Components { get; set; } = [];
}

/// <summary>
/// Describes how a client-side UI component is loaded and rendered.
/// </summary>
public sealed class MUiEngineComponentDescriptor
{
    /// <summary>
    /// Gets or sets the component type key.
    /// </summary>
    public string ComponentType { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the JavaScript bundle URL.
    /// </summary>
    public string BundleUrl { get; set; } = string.Empty;
    /// <summary>
    /// Gets or sets the optional stylesheet URL.
    /// </summary>
    public string? CssUrl { get; set; }
    /// <summary>
    /// Gets or sets the custom element tag name.
    /// </summary>
    public string? CustomElementTag { get; set; }
    /// <summary>
    /// Gets or sets a value indicating whether the component is lazy loaded.
    /// </summary>
    public bool IsLazyLoaded { get; set; } = true;
    /// <summary>
    /// Gets or sets the required license tier for the component.
    /// </summary>
    public string RequiredTier { get; set; } = string.Empty;
}
