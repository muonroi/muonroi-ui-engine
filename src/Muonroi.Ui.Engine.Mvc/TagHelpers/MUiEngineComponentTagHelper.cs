using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Muonroi.Ui.Engine.Mvc.TagHelpers;

/// <summary>
/// Renders a custom UI engine web component and its optional assets.
/// </summary>
[HtmlTargetElement("mu-rule-component")]
public sealed class MUiEngineComponentTagHelper : TagHelper
{
    /// <summary>
    /// Gets or sets the component type used to build the custom element tag.
    /// </summary>
    [HtmlAttributeName("component-type")]
    public string ComponentType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the component properties serialized as HTML attributes.
    /// </summary>
    [HtmlAttributeName("props")]
    public IDictionary<string, string>? Props { get; set; }

    /// <summary>
    /// Gets or sets the optional JavaScript module URL to load after the component.
    /// </summary>
    [HtmlAttributeName("bundle-url")]
    public string? BundleUrl { get; set; }

    /// <summary>
    /// Gets or sets the optional stylesheet URL to include after the component.
    /// </summary>
    [HtmlAttributeName("css-url")]
    public string? CssUrl { get; set; }

    /// <summary>
    /// Processes the tag helper output for the configured component.
    /// </summary>
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
