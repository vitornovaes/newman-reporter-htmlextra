# Architecture & Workflow Diagrams

---

## Request Lifecycle

```mermaid
flowchart TD
    A[Pre-request Script(s)] --> B{Pre-request HTTP Calls}
    B -->|Multiple| C[Main HTTP Request]
    C --> D{Post-request HTTP Calls}
    D --> E[Post-request Script(s)]
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#bbf,stroke:#333,stroke-width:2px
    style E fill:#f9f,stroke:#333,stroke-width:2px
```

This diagram illustrates the full flow of a request, including nested HTTP calls made during pre-request and post-request scripts.

---

## UI Component Hierarchy

```mermaid
graph TD
    Root[Report Root]
    Root --> Header
    Root --> Nav[Navigation Tabs]
    Root --> Dashboard
    Root --> RequestsSection[Requests Section]
    Root --> FailedTests
    Root --> SkippedTests
    RequestsSection --> Iterations
    Iterations --> Folder
    Folder --> RequestCard
    RequestCard --> Tabs[Detail Tabs]
    Tabs --> Overview
    Tabs --> PreRequest
    Tabs --> Request
    Tabs --> Response
    Tabs --> PostRequest
    Tabs --> Tests
    Tabs --> Console
```

This diagram shows the hierarchical structure of the report UI components.

---

## Development Roadmap Timeline

```mermaid
gantt
    dateFormat  YYYY-MM-DD
    title Development Roadmap for UI/UX Revamp

    section Design
    Design System Creation       :a1, 2025-04-01, 2w

    section Core UI
    Core UI Implementation       :a2, after a1, 3w

    section Visualizations
    Enhanced Visualizations      :a3, after a2, 2w

    section Advanced Features
    Advanced Features            :a4, after a3, 3w

    section Testing
    Testing and Refinement       :a5, after a4, 2w
```

This Gantt chart outlines the planned phases and timeline for the UI/UX modernization project.