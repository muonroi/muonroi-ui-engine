using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Muonroi.Ui.Engine.Mvc;

public static class MUiEngineHtmlExtensions
{
    public static IHtmlContent MRenderRuleComponent(
        this IHtmlHelper htmlHelper,
        string componentType,
        IDictionary<string, string>? props = null,
        string? bundleUrl = null,
        string? cssUrl = null)
    {
        _ = htmlHelper;
        HtmlContentBuilder builder = new();
        string tagName = $"mu-{componentType}";

        string attributes = props is null
            ? string.Empty
            : string.Join(" ", props.Select(x =>
                $"{ToKebabCase(x.Key)}=\"{HtmlEncoder.Default.Encode(x.Value)}\""));

        builder.AppendHtml($"<{tagName} {attributes}></{tagName}>");

        if (!string.IsNullOrWhiteSpace(cssUrl))
        {
            builder.AppendHtml($@"<link rel=""stylesheet"" href=""{HtmlEncoder.Default.Encode(cssUrl)}"" />");
        }

        if (!string.IsNullOrWhiteSpace(bundleUrl))
        {
            builder.AppendHtml($@"<script type=""module"" src=""{HtmlEncoder.Default.Encode(bundleUrl)}""></script>");
        }

        return builder;
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
