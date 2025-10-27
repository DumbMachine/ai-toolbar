"use client";

import { Hash, MessageCircle, Settings, Users } from "lucide-react";
import { useState } from "react";

export default function Home() {
	return (
		<div className="max-w-5xl mx-auto min-h-svh px-4 py-8 flex flex-col gap-8">
			<header className="flex flex-col gap-1">
				<h1 className="text-3xl font-bold tracking-tight">Custom Registry</h1>
				<p className="text-muted-foreground">
					A custom registry for distributing components with immersive UI demos.
				</p>
			</header>

			<main className="flex flex-col flex-1">
				<div className="relative rounded-2xl border bg-muted/30 shadow-sm overflow-hidden flex-1">
					<div className="absolute top-0 left-0 right-0 border-b bg-card/60 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex items-center justify-between z-10">
						<span className="font-medium">Showcase: AI Toolbar Block</span>
						<span className="text-muted-foreground/70">Demo environment</span>
					</div>

					{/* Demo area */}
					<div className="pt-8 h-[80vh] flex items-stretch">
						<DemoSlackApp />
					</div>
				</div>
			</main>
		</div>
	);
}

const DemoSlackApp = () => {
	const [activeChannel, setActiveChannel] = useState("general");

	const channels = [
		{ id: "general", name: "general" },
		{ id: "design", name: "design" },
		{ id: "engineering", name: "engineering" },
		{ id: "random", name: "random" },
	];

	const messages = [
		{
			id: 1,
			user: "Aditi",
			text: "Hey team! Did you check out the new landing page updates?",
			time: "10:21 AM",
		},
		{
			id: 2,
			user: "Rohan",
			text: "Yeah, looks great! I think we can improve the hero section animation.",
			time: "10:23 AM",
		},
		{
			id: 3,
			user: "Saanvi",
			text: "I'll tweak the animation timing today. Should be done by evening.",
			time: "10:27 AM",
		},
	];

	return (
		<div className="flex-1 flex bg-background text-foreground overflow-hidden rounded-b-2xl">
			{/* Left sidebar */}
			<aside className="w-60 bg-card border-r flex flex-col">
				<div className="p-4 border-b flex items-center justify-between">
					<h1 className="text-lg font-bold text-primary">Workly</h1>
					<Settings className="w-4 h-4 text-muted-foreground" />
				</div>

				<div className="p-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-2">
					Channels
				</div>
				<nav className="flex-1 overflow-y-auto p-1">
					{channels.map((ch) => (
						<button
							key={ch.id}
							onClick={() => setActiveChannel(ch.id)}
							className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
								activeChannel === ch.id
									? "bg-accent text-accent-foreground"
									: "hover:bg-muted"
							}`}
						>
							<Hash className="w-4 h-4" />
							{ch.name}
						</button>
					))}
				</nav>

				<div className="p-3 border-t text-xs text-muted-foreground">
					<span className="font-medium">Active workspace:</span>
				</div>
			</aside>

			{/* Chat area */}
			<main className="flex-1 flex flex-col bg-muted/30 min-h-0 relative">
				<header className="h-14 border-b bg-card/80 backdrop-blur flex items-center justify-between px-4 shrink-0">
					<div className="flex items-center gap-2">
						<MessageCircle className="w-4 h-4 text-primary" />
						<h2 className="font-semibold text-sm">#{activeChannel}</h2>
					</div>
					<div className="text-xs text-muted-foreground">
						Connected • Last sync 2m ago
					</div>
				</header>

				<section className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
					{messages.map((msg) => (
						<div
							key={msg.id}
							className="flex items-start gap-3 hover:bg-accent/5 p-2 rounded-md transition-colors"
						>
							<div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
								{msg.user[0]}
							</div>
							<div className="flex flex-col flex-1">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">{msg.user}</span>
									<span className="text-xs text-muted-foreground">
										{msg.time}
									</span>
								</div>
								<p className="text-sm leading-relaxed">{msg.text}</p>
							</div>
						</div>
					))}
				</section>

				<footer className="h-auto border-t bg-card/90 backdrop-blur p-3 shrink-0">
					<div className="flex items-center gap-2">
						<input
							type="text"
							placeholder={`Message #${activeChannel}`}
							className="flex-1 px-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
						/>
						<button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors">
							Send
						</button>
					</div>
				</footer>
			</main>

			{/* Right sidebar */}
			<aside className="w-60 border-l bg-card/40 hidden xl:flex flex-col">
				<div className="p-4 border-b flex items-center justify-between">
					<h3 className="text-sm font-medium">Members</h3>
					<Users className="w-4 h-4 text-muted-foreground" />
				</div>

				<div className="flex-1 p-4 space-y-3 text-sm">
					{["Aditi", "Rohan", "Saanvi"].map((name, i) => (
						<div key={name} className="flex items-center gap-2">
							<div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary">
								{name[0]}
							</div>
							<span>{name}</span>
						</div>
					))}
				</div>
			</aside>
		</div>
	);
};
