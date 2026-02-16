import { useState, useCallback } from 'react';

const key = "scaffolderStudioRightSideContentWidth"

export const useSidebarResize = (initialWidth: number = 540) => {
    const [width, setWidth] = useState(() => {
        const savedWidth = localStorage.getItem(key);
        return savedWidth ? Number(savedWidth) : initialWidth;
    });

    const onPointerMove = useCallback((e: PointerEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        setWidth(newWidth);
        localStorage.setItem(key, String(newWidth));
        e.preventDefault();
    }, []);

    const endDrag = useCallback(() => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', endDrag);
    }, [onPointerMove]);

    const startDrag: React.PointerEventHandler<HTMLDivElement> = useCallback(e => {
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        (e.target as Element).setPointerCapture?.(e.pointerId);
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', endDrag);
        e.preventDefault();
    }, [onPointerMove, endDrag]);

    return { width, startDrag };
};
