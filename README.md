## Using the AI Annotation Toolbar

![Toolbar Demo](/public/demo.webp)

Select any element and share with claude, cursor or any agent to change, with context!
No more, copilot wasting your precious tokens on guessing which file to edit. 

- Choose between single or multiple element selection and select your desired elements
- Get the context information like component name, file location and props.

### Install via shadcn registry

You can install the AI Annotation Toolbar component using the shadcn CLI:
```sh
npx shadcn@latest add https://raw.githubusercontent.com/DumbMachine/ai-toolbar/refs/heads/main/public/r/hello-world.json
```

This will fetch the registry directly from the GitHub repository.

### Usage in Development (Root Level)

To use the toolbar at the root of your app (e.g., in `app/page.tsx`):
```tsx
import AIToolbar from "@/components/ai-toolbar/ai-toolbar";

export default function Page() {
	return (
		<main>
			{process.env.NODE_ENV === "development" && <AIToolbar />}
			<body>{children}</body>
		</main>
	);
}

```

## Resources

As is the fashion of the day, this is just a wrapper over amazing work done by others.
This would not be possible with [bippy](https://github.com/aidenybai/bippy) by [Aiden Bai](https://github.com/aidenybai).

[inspector.tsx](https://github.com/aidenybai/bippy/blob/main/packages/kitchen-sink/src/inspector.tsx) is a fantastic read. 

PS: Aiden, if you read this, I'd love to pick your brain about same and ami.