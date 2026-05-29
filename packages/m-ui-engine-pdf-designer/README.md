# @muonroi/ui-engine-pdf-designer

React component for designing PDF templates in the Muonroi ecosystem.

## License

**Commercial.** This package requires a valid Muonroi commercial license.
See [LICENSE-COMMERCIAL](./LICENSE-COMMERCIAL) for terms.
Contact: license@muonroi.com

## Usage

```ts
import { MuPdfTemplateDesigner } from "@muonroi/ui-engine-pdf-designer";

// At app startup — global auth/tenant config
import { MConfigureRuleComponentRuntime } from "@muonroi/ui-engine-core";
MConfigureRuleComponentRuntime({
  mGetTenantId: () => tenantId,
  headers: { Authorization: `Bearer ${token}` }
});

// Render the designer
<MuPdfTemplateDesigner
  template={htmlString}
  onTemplateChange={(html) => setState(html)}
  onSubmit={async (html) => { /* call PdfTemplateApiClient */ }}
  apiBaseUrl="https://your-control-plane/api/v1/control-plane"
  tenantId="your-tenant"
  getAccessToken={() => token}
  licenseStatus="licensed"
/>
```

## Requirements

- React 18+
- `@muonroi/ui-engine-core` >= 0.1.0 (peer dependency)
- Valid `pdf.designer` capability in your Muonroi license JWT
