"use client";

import { Box, GitBranch, MousePointer2, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { useDrawSelect, useSingleSelect } from "./hooks/use-bippy";

// TypeScript interfaces
interface FiberInfo {
	componentName: string;
	props: Record<string, unknown>;
	source?: {
		fileName: string;
		lineNumber: number;
		columnNumber: number;
	} | null;
}

interface AnnotationData {
	element?: Element;
	elements?: Element[];
	rect: DOMRect | SelectionRect;
	fiberInfo: FiberInfo | FiberInfo[] | null;
	id: number;
	mode?: string;
}

interface Position {
	x: number;
	y: number;
}

interface SelectionRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface AnnotationCardProps {
	annotation: AnnotationData;
	index: number;
	isActive: boolean;
	onClick: () => void;
}

interface PromptPosition {
	left: number;
	top: number;
}

interface SinglePromptDialogProps {
	annotation: AnnotationData;
	onClose: () => void;
	position: PromptPosition;
}

interface HighlightOverlayProps {
	rect: DOMRect | SelectionRect | null;
	color?: "primary" | "secondary";
	style?: "dashed" | "solid";
}

interface SelectionRectangleProps {
	startPos: Position | null;
	currentPos: Position | null;
}

// Helper function from hooks
const getSelectionRect = (
	start: Position | null,
	end: Position | null,
): SelectionRect | null => {
	if (!start || !end) return null;
	return {
		left: Math.min(start.x, end.x),
		top: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x),
		height: Math.abs(end.y - start.y),
	};
};

const annotationToPrompt = (
	annotation: AnnotationData,
	changeRequest: string,
	idx?: number,
) => {
	const fiberInfo = Array.isArray(annotation.fiberInfo)
		? annotation.fiberInfo[0]
		: annotation.fiberInfo;

	const componentName = fiberInfo?.componentName || "unknown";
	const source = fiberInfo?.source;
	const props = fiberInfo?.props;

	let contextInfo = `[Component: <${componentName}>]`;

	if (source) {
		contextInfo += `\n[Location: ${source.fileName}:${source.lineNumber}:${source.columnNumber}]`;
	}

	if (props && Object.keys(props).length > 0) {
		const propsList = Object.entries(props)
			.slice(0, 5)
			.map(
				([key, val]) => `${key}=${typeof val === "string" ? `"${val}"` : val}`,
			)
			.join(", ");
		contextInfo += `\n[Props: ${propsList}${Object.keys(props).length > 5 ? "..." : ""}]`;
	}

	return `Annotation ${idx ? idx : ""}:\n${contextInfo}\n[Change Request]: ${changeRequest}\n`;
};

const AnnotationCard: React.FC<AnnotationCardProps> = ({
	annotation,
	index,
	isActive,
	onClick,
}) => {
	const fiberInfo = Array.isArray(annotation.fiberInfo)
		? annotation.fiberInfo[0]
		: annotation.fiberInfo;

	const sourceInfo = fiberInfo?.source;
	const componentName = fiberInfo?.componentName || "unknown";

	const handleClick = useCallback(() => {
		onClick();
	}, [onClick]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onClick();
			}
		},
		[onClick],
	);

	return (
		<div
			className={`border rounded-lg p-3 cursor-pointer transition-all ${
				isActive
					? "border-primary bg-primary/5"
					: "border-border hover:border-accent"
			}`}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			role="button"
			tabIndex={0}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span className="text-xs bg-muted px-2 py-1 rounded-full font-mono">
						#{index + 1}
					</span>
					<span className="text-sm font-medium text-primary">
						&lt;{componentName}&gt;
					</span>
				</div>
				{Array.isArray(annotation.fiberInfo) && (
					<span className="text-xs text-muted-foreground">
						{annotation.fiberInfo.length} elements
					</span>
				)}
			</div>

			{sourceInfo && (
				<div className="text-xs text-muted-foreground mb-2">
					<div className="font-mono bg-muted/50 px-2 py-1 rounded text-xs">
						{sourceInfo.fileName}:{sourceInfo.lineNumber}:
						{sourceInfo.columnNumber}
					</div>
				</div>
			)}

			{fiberInfo?.props && Object.keys(fiberInfo.props).length > 0 && (
				<div className="text-xs text-muted-foreground">
					<div className="font-mono">
						Props: {Object.keys(fiberInfo.props).slice(0, 3).join(", ")}
						{Object.keys(fiberInfo.props).length > 3 && "..."}
					</div>
				</div>
			)}
		</div>
	);
};

const MultiAnnotationPromptDialog: React.FC<{
	annotations: AnnotationData[];
	activeAnnotation: AnnotationData | null;
	onClose: () => void;
	position: PromptPosition;
	onAnnotationSelect: (annotation: AnnotationData) => void;
}> = ({
	annotations,
	activeAnnotation,
	onClose,
	position,
	onAnnotationSelect,
}) => {
	const [value, setValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [response, setResponse] = useState("");

	const handleSubmit = useCallback(async () => {
		if (!value.trim()) return;

		setLoading(true);

		// Generate context-enriched prompts for each annotation
		const enrichedPrompts = annotations
			.map((ann, idx) => annotationToPrompt(ann, value, idx + 1))
			.join("\n---\n\n");

		setResponse(enrichedPrompts);
		setLoading(false);
	}, [value, annotations]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	const handleReset = useCallback(() => {
		setValue("");
		setResponse("");
	}, []);

	return (
		<div
			className="ai-toolbar-container fixed z-999999 bg-popover border rounded-xl shadow-lg min-w-[500px] max-w-[700px] max-h-[80vh] flex flex-col overflow-hidden"
			style={{
				left: `${position.left}px`,
				top: `${position.top}px`,
			}}
		>
			<div className="p-4 border-b flex justify-between items-center">
				<div className="text-sm font-medium text-primary">
					Multiple Annotations ({annotations.length})
				</div>
				<button
					type="button"
					onClick={onClose}
					className="text-muted-foreground hover:text-foreground transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="flex flex-1 overflow-hidden">
				{/* Annotations sidebar */}
				<div className="w-1/3 border-r bg-muted/20 p-3 overflow-y-auto">
					<div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
						Selected Elements
					</div>
					<div className="space-y-2">
						{annotations.map((annotation, index) => (
							<AnnotationCard
								key={annotation.id}
								annotation={annotation}
								index={index}
								isActive={activeAnnotation?.id === annotation.id}
								onClick={() => onAnnotationSelect(annotation)}
							/>
						))}
					</div>
				</div>

				{/* Main content */}
				<div className="flex-1 p-4 overflow-y-auto">
					{!response ? (
						<div className="flex flex-col gap-3">
							<label
								htmlFor="multi-annotation-input"
								className="text-sm font-medium text-foreground"
							>
								Describe changes for all selected elements:
							</label>
							<textarea
								id="multi-annotation-input"
								value={value}
								onChange={(e) => setValue(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="e.g., Make all buttons consistent with primary color and same padding..."
								className="w-full min-h-[120px] bg-background text-foreground border rounded-lg px-3 py-2 text-sm resize-vertical outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
							/>

							{activeAnnotation && (
								<div className="p-3 bg-accent/20 rounded-lg">
									<div className="text-xs font-medium text-muted-foreground mb-2">
										Active Element Context:
									</div>
									<div className="text-sm">
										{Array.isArray(activeAnnotation.fiberInfo) ? (
											<div>
												<strong>
													{activeAnnotation.fiberInfo.length} elements selected
												</strong>
												<div className="text-xs text-muted-foreground mt-1">
													{activeAnnotation.fiberInfo.map((info, idx) => (
														<div
															key={`${info.componentName}-${idx}`}
															className="font-mono"
														>
															{info.componentName}{" "}
															{info.source &&
																`(${info.source.fileName}:${info.source.lineNumber})`}
														</div>
													))}
												</div>
											</div>
										) : (
											<div>
												<strong>
													&lt;{activeAnnotation.fiberInfo?.componentName}&gt;
												</strong>
												{activeAnnotation.fiberInfo?.source && (
													<div className="text-xs text-muted-foreground font-mono mt-1">
														{activeAnnotation.fiberInfo.source.fileName}:
														{activeAnnotation.fiberInfo.source.lineNumber}:
														{activeAnnotation.fiberInfo.source.columnNumber}
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							)}

							<button
								type="button"
								onClick={handleSubmit}
								disabled={!value.trim() || loading}
								className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-lg px-4 py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
							>
								{loading
									? "Generating..."
									: `Generate Changes for ${annotations.length} Elements`}
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<div className="p-3 bg-muted rounded-lg text-sm">
								<strong>Request:</strong> {value}
							</div>
							<pre className="bg-muted border rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono">
								{response}
							</pre>
							<button
								type="button"
								onClick={handleReset}
								className="bg-background border hover:bg-accent hover:text-accent-foreground rounded-lg px-4 py-2 text-sm transition-colors"
							>
								New Request
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const SingleAnnotationPromptDialog: React.FC<SinglePromptDialogProps> = ({
	annotation,
	onClose,
	position,
}) => {
	const [value, setValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [response, setResponse] = useState("");

	const handleSubmit = useCallback(async () => {
		if (!value.trim()) return;

		setLoading(true);

		// Generate context-enriched prompts for each annotation
		const enrichedPrompts = [annotation]
			.map((ann, idx) => annotationToPrompt(ann, value, idx + 1))
			.join("\n---\n\n");

		setResponse(enrichedPrompts);
		setLoading(false);
	}, [value, annotation]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	const handleReset = useCallback(() => {
		setValue("");
		setResponse("");
	}, []);

	const fiberInfo = useMemo(
		() =>
			Array.isArray(annotation.fiberInfo)
				? annotation.fiberInfo[0]
				: annotation.fiberInfo,
		[annotation.fiberInfo],
	);

	return (
		<div
			className="ai-toolbar-container fixed z-999999 bg-popover border rounded-xl shadow-lg min-w-[400px] max-w-[500px] max-h-[600px] flex flex-col overflow-hidden"
			style={{
				left: `${position.left}px`,
				top: `${position.top}px`,
			}}
		>
			<div className="p-4 border-b flex justify-between items-center">
				<div className="text-sm font-medium text-primary">
					&lt;{fiberInfo?.componentName}&gt;
				</div>
				<button
					type="button"
					onClick={onClose}
					className="text-muted-foreground hover:text-foreground transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="p-4 flex-1 overflow-y-auto">
				{fiberInfo?.source && (
					<div className="mb-3 p-3 bg-accent/20 rounded-lg">
						<div className="text-xs font-medium text-muted-foreground mb-1">
							Source Location:
						</div>
						<div className="text-xs font-mono bg-muted px-2 py-1 rounded">
							{fiberInfo.source.fileName}:{fiberInfo.source.lineNumber}:
							{fiberInfo.source.columnNumber}
						</div>
					</div>
				)}

				{!response ? (
					<div className="flex flex-col gap-3">
						<label
							htmlFor="single-annotation-input"
							className="text-sm font-medium text-foreground"
						>
							Describe the change you want to make:
						</label>
						<textarea
							id="single-annotation-input"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="e.g., Change the button color to blue and increase padding..."
							className="w-full min-h-[100px] bg-background text-foreground border rounded-lg px-3 py-2 text-sm resize-vertical outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
						/>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={!value.trim() || loading}
							className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-lg px-4 py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
						>
							{loading ? "Generating..." : "Generate Changes"}
						</button>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						<div className="p-3 bg-muted rounded-lg text-sm">
							<strong>Request:</strong> {value}
						</div>
						<pre className="bg-muted border rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono">
							{response}
						</pre>
						<button
							type="button"
							onClick={handleReset}
							className="bg-background border hover:bg-accent hover:text-accent-foreground rounded-lg px-4 py-2 text-sm transition-colors"
						>
							New Annotation
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
	rect,
	color = "primary",
	style = "dashed",
}) => {
	if (!rect) return null;

	const colorMap: Record<string, string> = {
		primary: "border-primary bg-primary/10",
		secondary: "border-secondary bg-secondary/10",
	};

	return (
		<div
			className={`fixed pointer-events-none z-999998 transition-all ${colorMap[color]}`}
			style={{
				left: `${rect.left}px`,
				top: `${rect.top}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
				borderWidth: "2px",
				borderStyle: style,
			}}
		/>
	);
};

const SelectionRectangle: React.FC<SelectionRectangleProps> = ({
	startPos,
	currentPos,
}) => {
	const rect = useMemo(
		() => getSelectionRect(startPos, currentPos),
		[startPos, currentPos],
	);

	if (!rect) return null;

	return (
		<div
			className="fixed pointer-events-none z-999998 border-2 border-dashed border-purple-500 bg-purple-500/10"
			style={{
				left: `${rect.left}px`,
				top: `${rect.top}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
			}}
		/>
	);
};

const AIAnnotationToolbar = () => {
	const [mode, setMode] = useState<
		null | "single-select" | "multi-comment" | "draw-select"
	>(null);
	const [position, setPosition] = useState(() => {
		const toolbarWidth = 400;
		const toolbarHeight = 80;
		const x =
			typeof window !== "undefined"
				? window.innerWidth / 2 - toolbarWidth / 2
				: 100;
		const y =
			typeof window !== "undefined"
				? window.innerHeight - toolbarHeight - 32
				: 100;
		return { x, y };
	});
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
	const [activeAnnotation, setActiveAnnotation] =
		useState<AnnotationData | null>(null);
	const [promptPosition, setPromptPosition] = useState({ left: 0, top: 0 });

	const toolbarRef = useRef<HTMLDivElement>(null);

	const tools = useMemo(
		() => [
			{
				id: "single-select" as const,
				icon: MousePointer2,
				label: "Single Select",
				tooltip: "Click elements to annotate",
			},
			{
				id: "multi-comment" as const,
				icon: GitBranch,
				label: "Multi Comment",
				tooltip: "Add multiple annotations",
			},
			{
				id: "draw-select" as const,
				icon: Box,
				label: "Draw Select",
				tooltip: "Draw rectangle to select & annotate",
			},
		],
		[],
	);

	const handleAnnotate = useCallback(
		(annotationData: AnnotationData) => {
			const newAnnotation: AnnotationData = {
				...annotationData,
				mode,
			};

			setAnnotations((prev) =>
				mode === "multi-comment" ? [...prev, newAnnotation] : [newAnnotation],
			);
			setActiveAnnotation(newAnnotation);

			// Position prompt dialog
			const rect = annotationData.rect;
			const dialogWidth = mode === "multi-comment" ? 650 : 450;
			const padding = 10;

			let left = rect.left + rect.width + padding;
			const top = rect.top;

			if (left + dialogWidth > window.innerWidth) {
				left = Math.max(padding, rect.left - dialogWidth - padding);
			}

			setPromptPosition({ left, top });
		},
		[mode],
	);

	const handleClosePrompt = useCallback(() => {
		if (mode !== "multi-comment") {
			setAnnotations([]);
		}
		setActiveAnnotation(null);
	}, [mode]);

	const handleModeChange = useCallback(
		(newMode: typeof mode) => {
			if (newMode === mode) {
				setMode(null);
				setAnnotations([]);
				setActiveAnnotation(null);
				return;
			}

			setMode(newMode);
			setAnnotations([]);
			setActiveAnnotation(null);
		},
		[mode],
	);

	// Single select mode
	const { element: singleElement, rect: singleRect } = useSingleSelect({
		enabled: mode === "single-select",
		onAnnotate: handleAnnotate,
	});

	// Multi comment mode
	const { element: multiElement, rect: multiRect } = useSingleSelect({
		enabled: mode === "multi-comment",
		onAnnotate: handleAnnotate,
	});

	// Draw select mode
	const { isDrawing, startPos, currentPos, selectedElements } = useDrawSelect({
		enabled: mode === "draw-select",
		onAnnotate: handleAnnotate,
	});

	// Toolbar dragging
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		const target = e.target as Element;
		if (target.closest(".drag-handle")) {
			setIsDragging(true);
			if (toolbarRef.current) {
				const rect = toolbarRef.current.getBoundingClientRect();
				setDragOffset({
					x: e.clientX - rect.left,
					y: e.clientY - rect.top,
				});
			}
		}
	}, []);

	// useEffect(() => {
	// 	if (!isDragging) return;

	// 	const handleMouseMove = (e: MouseEvent) => {
	// 		setPosition({
	// 			x: e.clientX - dragOffset.x,
	// 			y: e.clientY - dragOffset.y,
	// 		});
	// 	};

	// 	const handleMouseUp = () => {
	// 		setIsDragging(false);
	// 	};

	// 	document.addEventListener("mousemove", handleMouseMove);
	// 	document.addEventListener("mouseup", handleMouseUp);

	// 	return () => {
	// 		document.removeEventListener("mousemove", handleMouseMove);
	// 		document.removeEventListener("mouseup", handleMouseUp);
	// 	};
	// }, [isDragging, dragOffset]);

	return (
		<>
			{/* Floating Toolbar */}
			<div
				role={"toolbar"}
				ref={toolbarRef}
				className="ai-toolbar-container fixed z-[1000000]"
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
					cursor: isDragging ? "grabbing" : "default",
				}}
				onMouseDown={handleMouseDown}
			>
				<div className="bg-card/95 backdrop-blur-xl rounded-2xl border shadow-2xl p-2">
					<div className="flex items-center gap-1">
						{/* Left drag handle */}
						<div className="drag-handle cursor-grab active:cursor-grabbing px-2 py-2 hover:bg-accent rounded-lg transition-colors">
							<div className="flex flex-col gap-1">
								<div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
								<div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
								<div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
							</div>
						</div>

						{/* Comment counter (multi-comment mode) */}
						{mode === "multi-comment" && annotations.length > 0 && (
							<div className="px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
								<span className="text-primary text-sm font-medium">
									{annotations.length} annotations
								</span>
							</div>
						)}

						{/* Mode selection buttons */}
						{tools.map((tool) => {
							const Icon = tool.icon;
							const isActive = mode === tool.id;
							return (
								<button
									type={"button"}
									key={tool.id}
									onClick={() => handleModeChange(tool.id)}
									className={`p-3 rounded-lg transition-all group relative ${
										isActive ? "bg-accent shadow-lg" : "hover:bg-accent/50"
									}`}
								>
									<Icon
										className={`w-5 h-5 transition-colors ${
											isActive
												? "text-primary"
												: "text-muted-foreground group-hover:text-foreground"
										}`}
									/>
									<div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-popover text-xs text-popover-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border z-50 shadow-md">
										{tool.tooltip}
									</div>
									{isActive && (
										<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
									)}
								</button>
							);
						})}

						{/* Right drag handle */}
						<div className="drag-handle cursor-grab active:cursor-grabbing px-2 py-2 hover:bg-accent rounded-lg transition-colors">
							<div className="flex flex-col gap-1">
								<div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
								<div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
								<div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Hover highlights */}
			{mode === "single-select" && singleRect && !activeAnnotation && (
				<HighlightOverlay rect={singleRect} />
			)}

			{mode === "multi-comment" && multiRect && !activeAnnotation && (
				<HighlightOverlay rect={multiRect} />
			)}

			{/* Persistent annotation highlights */}
			{annotations.map((annotation) => (
				<HighlightOverlay
					key={annotation.id}
					rect={annotation.rect}
					color={annotation === activeAnnotation ? "primary" : "secondary"}
					style="solid"
				/>
			))}

			{/* Draw selection rectangle */}
			{isDrawing && (
				<SelectionRectangle startPos={startPos} currentPos={currentPos} />
			)}

			{/* Selected elements highlights */}
			{selectedElements.map((el, idx) => (
				<HighlightOverlay
					key={`selected-${idx}`}
					rect={el.getBoundingClientRect()}
					color="secondary"
				/>
			))}

			{/* Prompt dialog */}
			{activeAnnotation &&
				mode === "multi-comment" &&
				annotations.length > 1 && (
					<MultiAnnotationPromptDialog
						annotations={annotations}
						activeAnnotation={activeAnnotation}
						position={promptPosition}
						onClose={handleClosePrompt}
						onAnnotationSelect={setActiveAnnotation}
					/>
				)}

			{activeAnnotation &&
				(mode === "single-select" ||
					mode === "draw-select" ||
					(mode === "multi-comment" && annotations.length === 1)) && (
					<SingleAnnotationPromptDialog
						annotation={activeAnnotation}
						position={promptPosition}
						onClose={handleClosePrompt}
					/>
				)}
		</>
	);
};

export default AIAnnotationToolbar;
