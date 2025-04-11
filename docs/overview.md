# Project Overview

**Repository:** [github.com/DannyDainton/newman-reporter-htmlextra](https://github.com/DannyDainton/newman-reporter-htmlextra)

**Purpose:**  
Newman HTML Reporter providing comprehensive information about Postman Collection runs, with extended features like iteration separation and custom templates.

**Status:**  
Actively maintained and widely used. Needs modernization for a 2025 look and feel while preserving core functionality.

**Primary Requirements:**

- Modern UI/UX aligned with 2025 standards
- Display all requests and responses, including pre/post-request scripts
- Preserve report structure and metrics
- Maintain iteration tracking (success, fail, skip, total)
- Incorporate modern UI assets without losing functionality

---

# Core Features to Preserve

## Dashboard Summary

- High-level metrics overview
- Total iterations, assertions, failed/skipped tests
- File information
- Timing and data metrics
- Summary table (requests, scripts, assertions, skips)

## Request/Response Detail Tabs

- Organized by iteration
- Request info, headers, bodies
- Response info, headers, bodies
- Test results with pass/fail
- Optional console logs

## Display Options

- Light/Dark theme toggle
- Show only failures
- Pagination
- Custom browser/report titles
- Title size customization
- Environment/global variables
- Header/body toggles

## Navigation Structure

- Summary tab
- Total Requests tab
- Failed Tests tab
- Skipped Tests tab
- Folder-based request organization

---

# Current UI Pain Points

## Visual Design

- Outdated aesthetic, limited whitespace
- Basic color scheme, text-heavy
- Minimal hierarchy, limited responsiveness

## User Experience

- Dense info, overwhelming
- Limited status feedback
- Navigation could be more intuitive
- Basic code/data visualization
- Lacks modern interaction patterns

## Technical Limitations

- Minimal use of modern CSS frameworks
- Basic JavaScript interactions
- Limited data visualization
- Minimal modern web capabilities