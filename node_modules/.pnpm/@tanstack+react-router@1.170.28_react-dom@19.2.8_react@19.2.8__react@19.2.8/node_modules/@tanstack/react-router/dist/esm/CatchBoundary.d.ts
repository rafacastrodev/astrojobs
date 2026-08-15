import { ErrorRouteComponent } from './route.js';
import { ErrorInfo } from 'react';
import * as React from 'react';
export declare function CatchBoundary(props: {
    getResetKey: () => unknown;
    children: React.ReactNode;
    errorComponent?: ErrorRouteComponent;
    onCatch?: (error: Error, errorInfo: ErrorInfo) => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function ErrorComponent({ error }: {
    error: any;
}): import("react/jsx-runtime").JSX.Element;
