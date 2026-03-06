using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Muonroi.Ui.Engine.Mvc.TagHelpers;

[HtmlTargetElement("mu-rule-component")]
public sealed class MUiEngineComponentTagHelper : TagHelper
{
    [HtmlAttributeName("component-type")]
    public string ComponentType { get; set; } = string.Empty;

    [HtmlAttributeName("props")]
    public IDictionary<string, string>? Props { get; set; }

    [HtmlAttributeName("bundle-url")]
    public string? BundleUrl { get; set; }

    [HtmlAttributeName("css-url")]
    public string? CssUrl { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        if (string.IsNullOrWhiteSpace(ComponentType))
        {
            output.SuppressOutput();
            return;
        }

        output.TagName = $"mu-{ComponentType}";
        output.TagMode = TagMode.StartTagAndEndTag;

        if (Props is not null)
        {
            foreach ((string key, string value) in Props)
            {
                output.Attributes.SetAttribute(ToKebabCase(key), value);
            }
        }

        if (!string.IsNullOrWhiteSpace(CssUrl))
        {
            output.PostElement.AppendHtml($@"<link rel=""stylesheet"" href=""{HtmlEncoder.Default.Encode(CssUrl)}"" />");
        }

        if (!string.IsNullOrWhiteSpace(BundleUrl))
        {
            output.PostElement.AppendHtml($@"<script type=""module"" src=""{HtmlEncoder.Default.Encode(BundleUrl)}""></script>");
        }
    }

    private static string ToKebabCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        return string.Concat(value.Select((character, index) =>
            index > 0 && char.IsUpper(character)
                ? $"-{char.ToLowerInvariant(character)}"
                : char.ToLowerInvariant(character).ToString()));
    }
}
