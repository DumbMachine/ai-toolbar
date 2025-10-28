"use client";

import { Check, GitBranch, MousePointer2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";

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

interface HighlightOverlayProps {
	rect: DOMRect | SelectionRect | null;
	color?: "primary" | "secondary";
	style?: "dashed" | "solid";
}

interface SelectionRectangleProps {
	startPos: Position | null;
	currentPos: Position | null;
}

interface ToastProps {
	message: string;
	count?: number;
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

const annotationToPrompt = (annotation: AnnotationData, idx?: number) => {
	const fiberInfo = Array.isArray(annotation.fiberInfo)
		? annotation.fiberInfo[0]
		: annotation.fiberInfo;

	console.log({ fiberInfo });
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
	return `
<referenced_element>
${contextInfo}
</referenced_element>
	`;
};

const Toast: React.FC<ToastProps> = ({ message, count }) => {
	return (
		<div className="fixed top-8 left-1/2 -translate-x-1/2 z-1000001 animate-in fade-in slide-in-from-top-4 duration-300">
			<div className="bg-card border rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3 min-w-[300px]">
				<div className="shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
					<Check className="w-5 h-5 text-primary" />
				</div>
				<div className="flex-1">
					<p className="text-sm font-medium text-foreground">{message}</p>
					{count && count > 1 && (
						<p className="text-xs text-muted-foreground mt-0.5">
							{count} annotations copied
						</p>
					)}
				</div>
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
	
	// Initialize position to bottom center (like Vercel toolbar)
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [annotationCount, setAnnotationCount] = useState(0);

	const toolbarRef = useRef<HTMLDivElement>(null);
	const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Set initial position to bottom center
	useEffect(() => {
		if (typeof window !== "undefined" && toolbarRef.current) {
			const updatePosition = () => {
				const toolbarRect = toolbarRef.current?.getBoundingClientRect();
				if (toolbarRect) {
					const x = window.innerWidth / 2 - toolbarRect.width / 2;
					const y = window.innerHeight - toolbarRect.height - 32; // 32px from bottom
					setPosition({ x, y });
				}
			};

			// Set initial position after component mounts
			const timer = setTimeout(updatePosition, 0);
			
			// Update position on window resize
			window.addEventListener('resize', updatePosition);
			
			return () => {
				clearTimeout(timer);
				window.removeEventListener('resize', updatePosition);
			};
		}
	}, []);

	const tools = useMemo(
		() => [
			{
				id: "single-select" as const,
				icon: MousePointer2,
				label: "Single Select",
				tooltip: "Click elements to copy context",
			},
			{
				id: "multi-comment" as const,
				icon: GitBranch,
				label: "Multi Comment",
				tooltip: "Add multiple annotations",
			},
			// {
			// 	id: "draw-select" as const,
			// 	icon: Box,
			// 	label: "Draw Select",
			// 	tooltip: "Draw rectangle to copy context",
			// },
		],
		[],
	);

	const copyToClipboard = useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (err) {
			console.error("Failed to copy:", err);
			return false;
		}
	}, []);

	const showToastNotification = useCallback(
		(message: string, count: number = 1) => {
			if (toastTimeoutRef.current) {
				clearTimeout(toastTimeoutRef.current);
			}

			setToastMessage(message);
			setAnnotationCount(count);
			setShowToast(true);

			toastTimeoutRef.current = setTimeout(() => {
				setShowToast(false);
			}, 3000);
		},
		[],
	);

	const handleAnnotate = useCallback(
		async (annotationData: AnnotationData) => {
			const newAnnotation: AnnotationData = {
				...annotationData,
				mode,
			};

			if (mode === "multi-comment") {
				setAnnotations((prev) => [...prev, newAnnotation]);
			} else {
				// Single select or draw select - copy immediately
				const contextText = annotationToPrompt(newAnnotation);
				const success = await copyToClipboard(contextText);

				if (success) {
					showToastNotification("Context copied to clipboard!");
				}

				// Clear after a brief highlight
				setTimeout(() => {
					setAnnotations([]);
					setMode(null);
				}, 500);
			}
		},
		[mode, copyToClipboard, showToastNotification],
	);

	const handleModeChange = useCallback(
		async (newMode: typeof mode) => {
			// If clicking multi-comment while in multi-comment mode with annotations
			if (
				newMode === "multi-comment" &&
				mode === "multi-comment" &&
				annotations.length > 0
			) {
				// Copy all annotations
				const contextText = annotations
					.map((ann, idx) => annotationToPrompt(ann, idx + 1))
					.join("\n---\n\n");

				const success = await copyToClipboard(contextText);

				if (success) {
					showToastNotification(
						"All contexts copied to clipboard!",
						annotations.length,
					);
				}

				// Clear annotations
				setAnnotations([]);
				setMode(null);
				return;
			}

			if (newMode === mode) {
				setMode(null);
				setAnnotations([]);
				return;
			}

			setMode(newMode);
			setAnnotations([]);
		},
		[mode, annotations, copyToClipboard, showToastNotification],
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

	// Toolbar dragging handlers
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		const target = e.target as Element;
		if (target.closest(".drag-handle")) {
			e.preventDefault();
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

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (isDragging) {
			e.preventDefault();
			const newX = e.clientX - dragOffset.x;
			const newY = e.clientY - dragOffset.y;
			
			// Optional: Add bounds checking to keep toolbar on screen
			const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 0);
			const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 0);
			
			setPosition({
				x: Math.max(0, Math.min(newX, maxX)),
				y: Math.max(0, Math.min(newY, maxY)),
			});
		}
	}, [isDragging, dragOffset]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Add global mouse event listeners for dragging
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			
			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	return (
		<>
			{/* Toast Notification */}
			{showToast && <Toast message={toastMessage} count={annotationCount} />}

			{/* Floating Toolbar */}
			<div
				role={"toolbar"}
				ref={toolbarRef}
				className="ai-toolbar-container fixed z-1000000"
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
					cursor: isDragging ? "grabbing" : "default",
					userSelect: "none", // Prevent text selection during drag
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
									{annotations.length} selected
								</span>
							</div>
						)}

						{/* Mode selection buttons */}
						{tools.map((tool) => {
							const Icon = tool.icon;
							const isActive = mode === tool.id;
							const showCopyIndicator =
								isActive &&
								tool.id === "multi-comment" &&
								annotations.length > 0;

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
										{showCopyIndicator ? "Click to copy all" : tool.tooltip}
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
			{mode === "single-select" && singleRect && (
				<HighlightOverlay rect={singleRect} />
			)}

			{mode === "multi-comment" && multiRect && (
				<HighlightOverlay rect={multiRect} />
			)}

			{/* Persistent annotation highlights */}
			{annotations.map((annotation) => (
				<HighlightOverlay
					key={annotation.id}
					rect={annotation.rect}
					color="secondary"
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
		</>
	);
};

export default AIAnnotationToolbar;