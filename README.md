## Using the AI Annotation Toolbar

The AI Annotation Toolbar fundamentally changes how you iterate on UI with AI coding assistants. Instead of describing components vaguely or taking screenshots, you can point directly at elements in your running app and generate precise, context-aware prompts that include file locations, component names, and props. This means faster feedback cycles and fewer back-and-forth messages with your AI coding agent.

### Install via shadcn registry

You can install the AI Annotation Toolbar component using the shadcn CLI:
```sh
npx shadcn@latest add https://raw.githubusercontent.com/DumbMachine/ai-toolbar/main/registry.json
```

This will fetch the registry directly from the GitHub repository.

### Usage in Development (Root Level)

To use the toolbar at the root of your app (e.g., in `app/page.tsx`):
```tsx
import dynamic from "next/dynamic";

// Dynamically import to ensure client-side rendering
const AIAnnotationToolbar = dynamic(
  () => import("registry/new-york/blocks/toolbar/ai-toolbar"),
  { ssr: false }
);

export default function Page() {
  return (
    <main>
      {/* Your page content */}
      <AIAnnotationToolbar />
    </main>
  );
}
```

### How It Works

The toolbar gives you three powerful annotation modes:

1. **Single Select**: Click any element to capture its component context, file location, and props. Perfect for quick, focused changes.

2. **Multi Comment**: Annotate multiple elements across your page, then generate a unified prompt that maintains context for each component. This is invaluable when you need consistent changes across different parts of your UI—like updating button styles or adjusting spacing across multiple cards.

3. **Draw Select**: Draw a rectangle to select multiple elements at once. Great for refactoring entire sections or applying batch updates.

Each mode generates **context-enriched prompts** that look like this:
```
[Component: <Button>]
[Location: src/components/ui/button.tsx:45:12]
[Props: variant="primary", size="lg", onClick=function]
[Change Request]: Make the corners more rounded and add a subtle shadow
```

This structured format gives AI agents everything they need: exact file locations to edit, component structure to understand, and clear instructions on what to change. No more "that button on the left" or "the card component somewhere in the dashboard."

### Better Feedback Cycles

Traditional workflow:
1. Describe component in words → 
2. AI guesses location → 
3. Wrong file edited → 
4. Clarify again → 
5. Finally correct

With the toolbar:
1. Click element → 
2. Copy enriched prompt → 
3. Paste to AI agent → 
4. Changes applied to exact location

The toolbar essentially bridges the gap between your visual understanding of the UI and the AI's need for precise technical context. You're not just annotating—you're building a shared language with your AI assistant.

### Requirements

- Tailwind CSS v4
- lucide-react icons
- React 18+

### Tips for Best Results

- **Be specific in your change requests**: The context is automatically captured, so focus your energy on describing the change clearly.
- **Use Multi Comment for consistency**: When you want the same change across multiple components, annotate them all first, then write one change request that applies to everything.
- **Copy prompts immediately**: Hit that "Copy to Clipboard" button and paste directly into your AI coding assistant—Claude, Cursor, or whatever you're using.

### Registry Command Reference

- Build registry:
```sh
  npx shadcn-ui@latest build
```
- Add component:
```sh
  npx shadcn-ui@latest add ai-toolbar --registry=https://your-registry-url
```

See [`registry/new-york/blocks/toolbar/ai-toolbar.tsx`](registry/new-york/blocks/toolbar/ai-toolbar.tsx:1) for implementation details.

---

