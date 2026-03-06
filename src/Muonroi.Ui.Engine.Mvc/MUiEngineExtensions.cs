using Muonroi.Ui.Engine.Mvc.Models;

namespace Muonroi.Ui.Engine.Mvc;

public static class MUiEngineExtensions
{
    public static bool MCanRender(this MUiEngineNavigationNode node)
    {
        return node.IsVisible;
    }

    public static bool MCanExecute(this MUiEngineAction action)
    {
        return action.IsEnabled;
    }

    public static IReadOnlyList<MUiEngineNavigationNode> MVisibleItems(this MUiEngineNavigationGroup group)
    {
        return group.Items.Where(static item => item.IsVisible).OrderBy(static item => item.Order).ToList();
    }
}