# Development Roadmap (Updated April 2025)

## Phase 1: Design System Creation **(Completed)**

- Created `lib/design-system.css` with:
  - Color palette and design tokens
  - Typography system
  - Spacing scale
  - Shadows and border radius
  - Light and dark mode variables
  - Base typography and layout styles
- Linked design system CSS into the Handlebars template
- Prepared for modular, accessible component styling

---

## Phase 2: Core UI Implementation **(In Progress)**

### Completed so far:

- Linked `design-system.css` in the template `<head>`
- Wrapped theme toggle and title inside `<header class="app-header" role="banner">`
- Wrapped navigation tabs inside `<nav class="main-nav" role="navigation" aria-label="Main Navigation">`
- Wrapped all main content inside `<main class="main-content" role="main">`
- Replaced outermost Bootstrap `.container` with `.app-container`
- Replaced Bootstrap grid classes:
  - `.row` → `.grid-row`
  - `.col-*` → `.grid-col`
  - `.card-deck` → `.card-group`
- Styled `.grid-row`, `.grid-col`, `.card-group` using CSS Flexbox with design tokens
- Migrated inline styles (spacing, card colors, badge colors) into design tokens and utility classes
- Added ARIA roles and labels to improve accessibility of header, navigation, and main content
- Enhanced tab accessibility with ARIA attributes
- Updated JavaScript interactivity:
  - Vanilla JS tab switching with accessibility support
  - Vanilla JS theme toggle with localStorage
- **Integrated Prism.js** for syntax highlighting:
  - Added Prism CSS theme
  - Added Prism core JS
  - Automatic highlighting of all code blocks
- Preserved all Handlebars helpers and expressions

### Remaining:

- Finalize accessibility improvements
- Testing and validation

---

## Next Phases

- **Phase 3:** Enhanced visualizations
- **Phase 4:** Advanced features (filtering, export, error tracking)
- **Phase 5:** Testing, optimization, documentation

---

# Testing and Validation Approach

_(unchanged)_

---

# Best Practices

_(unchanged)_

---

# Conclusion

The project is progressing through the roadmap, with Phase 1 completed and major parts of Phase 2 implemented, including semantic structure, design system integration, Bootstrap removal, accessibility improvements, modern JavaScript interactivity, and Prism.js syntax highlighting.