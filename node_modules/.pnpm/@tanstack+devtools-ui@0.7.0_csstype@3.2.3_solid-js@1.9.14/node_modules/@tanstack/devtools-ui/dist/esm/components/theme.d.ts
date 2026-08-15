import { Accessor, JSX } from 'solid-js';
export type TanStackDevtoolsTheme = 'light' | 'dark';
type ThemeContextValue = {
    theme: Accessor<TanStackDevtoolsTheme>;
    setTheme: (theme: TanStackDevtoolsTheme) => void;
};
export declare const ThemeContextProvider: (props: {
    children: JSX.Element;
    theme: TanStackDevtoolsTheme;
}) => JSX.Element;
export declare function createTheme(): ThemeContextValue;
export {};
