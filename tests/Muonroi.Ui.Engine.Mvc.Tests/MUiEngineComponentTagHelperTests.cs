using Microsoft.AspNetCore.Razor.TagHelpers;
using Muonroi.Ui.Engine.Mvc.TagHelpers;
using Xunit;

namespace Muonroi.Ui.Engine.Mvc.Tests;

public sealed class MUiEngineComponentTagHelperTests
{
    [Fact]
    public void Process_Suppresses_Output_When_Component_Type_Is_Missing()
    {
        MUiEngineComponentTagHelper helper = new();
        TagHelperOutput output = CreateOutput();

        helper.Process(CreateContext(), output);

        Assert.Null(output.TagName);
        Assert.True(output.IsContentModified);
    }

    [Fact]
    public void Process_Renders_Tag_Attributes_And_Assets()
    {
        MUiEngineComponentTagHelper helper = new()
        {
            ComponentType = "rule-flow-designer",
            Props = new Dictionary<string, string>
            {
                ["workflowName"] = "wf-orders",
                ["data-id"] = "42"
            },
            BundleUrl = "/assets/app.js?v=1&mode=prod",
            CssUrl = "/assets/app.css?v=1&mode=prod"
        };

        TagHelperOutput output = CreateOutput();

        helper.Process(CreateContext(), output);

        Assert.Equal("mu-rule-flow-designer", output.TagName);
        Assert.Equal(TagMode.StartTagAndEndTag, output.TagMode);
        Assert.Equal("wf-orders", output.Attributes["workflow-name"]?.Value);
        Assert.Equal("42", output.Attributes["data-id"]?.Value);
        Assert.Contains("/assets/app.css?v=1&amp;mode=prod", output.PostElement.GetContent());
        Assert.Contains("/assets/app.js?v=1&amp;mode=prod", output.PostElement.GetContent());
    }

    private static TagHelperContext CreateContext()
    {
        return new TagHelperContext(
            tagName: "mu-rule-component",
            allAttributes: new TagHelperAttributeList(),
            items: new Dictionary<object, object?>(),
            uniqueId: Guid.NewGuid().ToString("N"));
    }

    private static TagHelperOutput CreateOutput()
    {
        return new TagHelperOutput(
            "mu-rule-component",
            attributes: new TagHelperAttributeList(),
            getChildContentAsync: static (_, _) =>
            {
                TagHelperContent content = new DefaultTagHelperContent();
                return Task.FromResult<TagHelperContent>(content);
            });
    }
}
