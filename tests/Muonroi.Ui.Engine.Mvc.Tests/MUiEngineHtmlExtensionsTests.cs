using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using Muonroi.Ui.Engine.Mvc;
using Xunit;

namespace Muonroi.Ui.Engine.Mvc.Tests;

public sealed class MUiEngineHtmlExtensionsTests
{
    [Fact]
    public void MRenderRuleComponent_Renders_Tag_Without_Extra_Whitespace_When_Props_Are_Missing()
    {
        IHtmlContent content = MUiEngineHtmlExtensions.MRenderRuleComponent(
            htmlHelper: null!,
            componentType: "rule-flow-designer");

        string rendered = Render(content);

        Assert.Equal("<mu-rule-flow-designer></mu-rule-flow-designer>", rendered);
    }

    [Fact]
    public void MRenderRuleComponent_Encodes_Attributes_And_Appends_Assets()
    {
        IHtmlContent content = MUiEngineHtmlExtensions.MRenderRuleComponent(
            htmlHelper: null!,
            componentType: "decision-table",
            props: new Dictionary<string, string>
            {
                ["workflowName"] = "wf<orders>",
                ["data-id"] = "\"42\""
            },
            bundleUrl: "/assets/app.js?v=1&mode=prod",
            cssUrl: "/assets/app.css?v=1&mode=prod");

        string rendered = Render(content);

        Assert.Contains("<mu-decision-table", rendered);
        Assert.Contains("workflow-name=\"wf&lt;orders&gt;\"", rendered);
        Assert.Contains("data-id=\"&quot;42&quot;\"", rendered);
        Assert.Contains("<link rel=\"stylesheet\" href=\"/assets/app.css?v=1&amp;mode=prod\" />", rendered);
        Assert.Contains("<script type=\"module\" src=\"/assets/app.js?v=1&amp;mode=prod\"></script>", rendered);
    }

    private static string Render(IHtmlContent content)
    {
        using StringWriter writer = new();
        content.WriteTo(writer, HtmlEncoder.Default);
        return writer.ToString();
    }
}
