# Feature Enhancements

## Improved Request/Response Visualization

- Graphical representation of request chains
- Visualize pre-request and post-request scripts
- Timeline visualization for request durations
- Visual diff for expected vs. actual test results

## Advanced Filtering and Search

- Filter by multiple criteria (status, method, time)
- Full-text search across report
- Save/share filter configurations

## Custom Views and Layouts

- Customize visible columns
- Save custom views
- Collapsible sections for info density
- Split-view for comparing requests

## Export and Sharing Enhancements

- Export specific sections
- Share specific request details
- PDF export
- Shareable links to sections

## Advanced Data Visualization

- Charts and graphs for test results
- Timeline of request execution
- Network diagrams for dependencies
- Performance metrics visualization

---

# Pre/Post Script Call Visibility

## Goal

Capture and display **all HTTP calls** made during **pre-request** and **post-request** scripts for full transparency.

## Strategy

- Listen to Newman events:
  - `beforeRequest` for pre-request scripts
  - `request` for main requests
  - `script` for script-executed HTTP calls
- Store script code and nested HTTP calls
- Display in dedicated tabs with drilldown

## Template Updates

- Add **Pre-Request** and **Post-Request** tabs
- Show script code with syntax highlighting
- List nested HTTP calls with:
  - Method, URL, status, time
  - Request/response headers and bodies
  - Visual flow diagram

## Example: Script Call Capture (pseudo-code)

```js
if (httpCall.source === 'prerequest') {
  currentExecution.prerequest.calls.push({...});
} else if (httpCall.source === 'test') {
  currentExecution.postrequest.calls.push({...});
}
```

---

# Error Tracking Enhancements

- Categorize errors: validation, script, network
- Show expected vs. actual values
- Display error stack traces
- Visual indicators and summaries

---

# Additional Enhancements

- Performance metrics for all calls
- Contextual info: variables, dependencies, purpose
- Visual flow diagrams of request chains
- Export options for filtered views
- Accessibility improvements throughout