using Muonroi.Ui.Engine.Mvc.Models;

namespace Muonroi.Ui.Engine.Mvc;

/// <summary>
/// Provides convenience helpers for working with UI engine manifest models.
/// </summary>
public static class MUiEngineExtensions
{
    /// <summary>
    /// Determines whether the navigation node should be rendered.
    /// </summary>
    public static bool MCanRender(this MUiEngineNavigationNode node)
    {
        return node.IsVisible;
    }

    /// <summary>
    /// Determines whether the action can currently be executed.
    /// </summary>
    public static bool MCanExecute(this MUiEngineAction action)
    {
        return action.IsEnabled;
    }

    /// <summary>
    /// Returns visible navigation items ordered by their configured sort order.
    /// </summary>
    public static IReadOnlyList<MUiEngineNavigationNode> MVisibleItems(this MUiEngineNavigationGroup group)
    {
        return group.Items.Where(static item => item.IsVisible).OrderBy(static item => item.Order).ToList();
    }
}
