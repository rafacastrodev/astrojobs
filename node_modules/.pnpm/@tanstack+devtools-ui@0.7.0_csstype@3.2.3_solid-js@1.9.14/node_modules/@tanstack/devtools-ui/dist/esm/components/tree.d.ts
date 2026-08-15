import { CollapsiblePaths } from '../utils/deep-keys.js';
export declare function JsonTree<TData, TName extends CollapsiblePaths<TData>>(props: {
    value: TData;
    copyable?: boolean;
    defaultExpansionDepth?: number;
    collapsePaths?: Array<TName>;
    config?: {
        dateFormat?: string;
    };
}): import("solid-js").JSX.Element;
