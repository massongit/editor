import { eventmit } from "eventmit";

export type AnnotationItem = {
    start: number;
    end: number;
    onMouseEnter: ({ rectItem }: { rectItem: RectItem }) => void;
    onMouseLeave: ({ rectItem }: { rectItem: RectItem }) => void;
};

export type RectItem = { index: number; left: number; top: number; height: number; width: number };
export type TextCheckerState = {
    rectItems: RectItem[];
    annotationItems: AnnotationItem[];
    mouseHoverReactIdMap: Map<RectItem["index"], boolean>;
    highlightRectIdSet: Set<RectItem["index"]>;
};
export const createTextCheckerStore = (initialState?: Partial<TextCheckerState>) => {
    let textCheckerState: TextCheckerState = {
        rectItems: [],
        annotationItems: [],
        highlightRectIdSet: new Set(),
        mouseHoverReactIdMap: new Map(),
        ...initialState
    };
    const changeEvent = eventmit<void>();
    return {
        get(): TextCheckerState {
            return textCheckerState;
        },
        onChange(handler: () => void) {
            changeEvent.on(handler);
        },
        dispose() {
            changeEvent.offAll();
        },

        highlightRectIndexes(indexes: RectItem["index"][]) {
            textCheckerState = {
                ...textCheckerState,
                highlightRectIdSet: new Set([...textCheckerState.highlightRectIdSet, ...indexes])
            };
            changeEvent.emit();
        },
        update(state: Partial<TextCheckerState>) {
            textCheckerState = {
                ...textCheckerState,
                ...state
            };
            changeEvent.emit();
        }
    };
};
