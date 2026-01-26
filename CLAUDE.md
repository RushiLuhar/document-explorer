# Claude Constitution Explorer

## Project Overview

A webapp for visually exploring documents through interactive mind-maps with progressive disclosure. Users can navigate hierarchical document structures, drill down into topics, ask questions about content, and search the web for related information.

## Current Status

Proof of Concept phase using `claudes-constitution.pdf` as the sample document.

## Architecture

- **Frontend**: Canvas-based mind-map visualization with interactive nodes
- **Backend**: Document processing and Claude API integration
- **LLM Integration**: Claude APIs for document parsing, mind-map generation, and Q&A
- **Web Search**: Integration for exploring topics beyond document content

## Key Features

1. **Document Processing**: Parse uploaded documents (starting with PDF support)
2. **Mind-Map Generation**: Create hierarchical visualization of document contents
3. **Progressive Disclosure**: Click nodes to reveal more detail
4. **Node Navigation**: Navigate between related concepts
5. **Q&A**: Ask questions about specific node content
6. **Web Search**: Find additional information about topics

## Development Guidelines

- Create a new branch when working on new features or starting a new session
- Use Claude APIs for all LLM capabilities
- Keep the UI focused on exploration and discovery
- Prioritize the PoC with the constitution document before generalizing

## Sample Document

The `claudes-constitution.pdf` is Anthropic's detailed description of Claude's values, behavior guidelines, and design principles. It contains well-structured sections making it ideal for mind-map visualization:

- Overview
- Being helpful
- Following Anthropic's guidelines
- Being broadly ethical
- Being broadly safe
- Claude's nature
