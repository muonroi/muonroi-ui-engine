using Muonroi.Ui.Engine.Mvc;
using Muonroi.Ui.Engine.Mvc.Models;
using Xunit;

namespace Muonroi.Ui.Engine.Mvc.Tests;

public class MUiEngineExtensionsTests
{
    [Fact]
    public void MCanRender_Returns_Visibility()
    {
        MUiEngineNavigationNode node = new() { IsVisible = true };
        Assert.True(node.MCanRender());

        node.IsVisible = false;
        Assert.False(node.MCanRender());
    }

    [Fact]
    public void MCanExecute_Returns_Enablement()
    {
        MUiEngineAction action = new() { IsEnabled = true };
        Assert.True(action.MCanExecute());

        action.IsEnabled = false;
        Assert.False(action.MCanExecute());
    }

    [Fact]
    public void MVisibleItems_Filters_And_Orders()
    {
        MUiEngineNavigationGroup group = new()
        {
            Items =
            [
                new MUiEngineNavigationNode { UiKey = "a", IsVisible = true, Order = 2 },
                new MUiEngineNavigationNode { UiKey = "b", IsVisible = false, Order = 1 },
                new MUiEngineNavigationNode { UiKey = "c", IsVisible = true, Order = 0 }
            ]
        };

        var visible = group.MVisibleItems();
        Assert.Equal(2, visible.Count);
        Assert.Equal("c", visible[0].UiKey);
        Assert.Equal("a", visible[1].UiKey);
    }
}
