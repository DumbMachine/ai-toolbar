import {
	getDisplayName,
	getFiberFromHostInstance,
	getLatestFiber,
} from "bippy";
import { getFiberSource } from "bippy/dist/source.js";
import { useEffect, useRef, useState } from "react";

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

interface AnnotationData {
	element?: Element;
	elements?: Element[];
	rect: DOMRect | SelectionRect;
	fiberInfo: FiberInfo | FiberInfo[] | null;
	id: number;
}

interface HookProps {
	enabled: boolean;
	onAnnotate?: (data: AnnotationData) => void;
}

const throttle = (fn: (...args: unknown[]) => void, wait: number) => {
	let timeout: NodeJS.Timeout | null = null;
	return function (this: unknown, ...args: unknown[]) {
		if (!timeout) {
			timeout = setTimeout(() => {
				fn.apply(this, args);
				timeout = null;
			}, wait);
		}
	};
};

// Use actual bippy implementation for fiber detection
const getFiberInfo = async (element: Element): Promise<FiberInfo | null> => {
	if (!element) return null;

	try {
		const fiber = getFiberFromHostInstance(element);

		if (!fiber) {
			// Fallback to basic element info if no fiber found
			return {
				componentName: element.tagName.toLowerCase(),
				props: {},
				source: null,
			};
		}

		const latestFiber = getLatestFiber(fiber);
		const componentName =
			getDisplayName(latestFiber.type) || element.tagName.toLowerCase();
		const props = latestFiber.memoizedProps || {};

		// Get source information asynchronously
		let source = null;
		try {
			source = await getFiberSource(latestFiber);
		} catch (sourceError) {
			console.warn("Failed to get fiber source:", sourceError);
		}

		return {
			componentName,
			props,
			source,
		};
	} catch (error) {
		console.warn("Failed to get fiber info:", error);
		// Fallback to basic element info
		return {
			componentName: element.tagName.toLowerCase(),
			props: {},
			source: null,
		};
	}
};

// Hook for single select annotation
export const useSingleSelect = ({ enabled, onAnnotate }: HookProps) => {
	const [element, setElement] = useState<Element | null>(null);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const lastElementRef = useRef<Element | null>(null);
	const onAnnotateRef = useRef(onAnnotate);

	// Keep onAnnotate ref up to date without triggering effects
	useEffect(() => {
		onAnnotateRef.current = onAnnotate;
	}, [onAnnotate]);

	useEffect(() => {
		if (!enabled) {
			setElement(null);
			setRect(null);
			lastElementRef.current = null;
			return;
		}

		const handleMouseMove = throttle((event: MouseEvent) => {
			const el = document.elementFromPoint(event.clientX, event.clientY);

			if (!el || el.closest(".ai-toolbar-container")) return;

			// Only update if element actually changed
			if (el !== lastElementRef.current) {
				lastElementRef.current = el;
				setElement(el);
				setRect(el.getBoundingClientRect());
			}
		}, 32);

		const handleClick = async (event: MouseEvent) => {
			const el = document.elementFromPoint(event.clientX, event.clientY);
			if (!el || el.closest(".ai-toolbar-container")) return;

			event.preventDefault();
			event.stopPropagation();

			const fiberInfo = await getFiberInfo(el);
			if (fiberInfo && onAnnotateRef.current) {
				onAnnotateRef.current({
					element: el,
					rect: el.getBoundingClientRect(),
					fiberInfo,
					id: Date.now(),
				});
			}
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("click", handleClick, true);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("click", handleClick, true);
		};
	}, [enabled]); // Only depend on enabled

	return { element, rect };
};

// Hook for draw select mode
export const useDrawSelect = ({ enabled, onAnnotate }: HookProps) => {
	const [isDrawing, setIsDrawing] = useState(false);
	const [startPos, setStartPos] = useState<Position | null>(null);
	const [currentPos, setCurrentPos] = useState<Position | null>(null);
	const [selectedElements, setSelectedElements] = useState<Element[]>([]);
	const onAnnotateRef = useRef(onAnnotate);

	// Keep onAnnotate ref up to date without triggering effects
	useEffect(() => {
		onAnnotateRef.current = onAnnotate;
	}, [onAnnotate]);

	useEffect(() => {
		if (!enabled) {
			setIsDrawing(false);
			setStartPos(null);
			setCurrentPos(null);
			setSelectedElements([]);
			return;
		}

		const handleMouseDown = (e: MouseEvent) => {
			if ((e.target as Element)?.closest(".ai-toolbar-container")) return;

			setIsDrawing(true);
			const pos = { x: e.clientX, y: e.clientY };
			setStartPos(pos);
			setCurrentPos(pos);
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!isDrawing) return;

			const newPos = { x: e.clientX, y: e.clientY };
			setCurrentPos(newPos);
		};

		const handleMouseUp = async () => {
			if (!isDrawing) return;

			// Calculate final selection
			const rect = getSelectionRect(startPos, currentPos);
			const elements = rect ? findElementsInRect(rect) : [];

			if (elements.length > 0 && onAnnotateRef.current) {
				const fiberInfoPromises = elements.map((el) => getFiberInfo(el));
				const fiberInfoResults = await Promise.all(fiberInfoPromises);
				const fiberInfo = fiberInfoResults.filter(
					(info): info is FiberInfo => info !== null,
				);

				if (rect) {
					onAnnotateRef.current({
						elements: elements,
						rect,
						fiberInfo,
						id: Date.now(),
					});
				}
			}

			setIsDrawing(false);
			setStartPos(null);
			setCurrentPos(null);
			setSelectedElements([]);
		};

		document.addEventListener("mousedown", handleMouseDown);
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousedown", handleMouseDown);
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [enabled, isDrawing, startPos, currentPos]); // Include drawing state

	// Update selected elements as user drags
	useEffect(() => {
		if (!enabled || !isDrawing || !startPos || !currentPos) {
			setSelectedElements([]);
			return;
		}

		const rect = getSelectionRect(startPos, currentPos);
		if (rect) {
			const elements = findElementsInRect(rect);
			setSelectedElements(elements);
		}
	}, [enabled, isDrawing, startPos, currentPos]);

	return { isDrawing, startPos, currentPos, selectedElements };
};

// Helper functions
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

const findElementsInRect = (rect: SelectionRect | null): Element[] => {
	if (!rect) return [];
	const elements: Element[] = [];
	const allElements = document.querySelectorAll("body *");

	allElements.forEach((el) => {
		if (el.closest(".ai-toolbar-container")) return;
		const elRect = el.getBoundingClientRect();
		if (isRectIntersecting(rect, elRect)) {
			elements.push(el);
		}
	});

	return elements;
};

const isRectIntersecting = (rect1: SelectionRect, rect2: DOMRect): boolean => {
	return !(
		rect1.left + rect1.width < rect2.left ||
		rect2.left + rect2.width < rect1.left ||
		rect1.top + rect1.height < rect2.top ||
		rect2.top + rect2.height < rect1.top
	);
};
