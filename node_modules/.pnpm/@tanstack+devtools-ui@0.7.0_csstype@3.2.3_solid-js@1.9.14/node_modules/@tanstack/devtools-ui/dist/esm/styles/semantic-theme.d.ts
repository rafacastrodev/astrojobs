import { TanStackDevtoolsTheme } from '../components/theme.js';
export declare const DEVTOOLS_FONT_STYLE_ID = "tanstack-devtools-fonts";
export declare const DEVTOOLS_FORCED_COLORS_STYLE_ID = "tanstack-devtools-forced-colors";
export declare const forcedColorsCss = "\n@media (forced-colors: active) {\n  [data-tsd-surface] { forced-color-adjust: auto; background: Canvas; color: CanvasText; }\n  [data-tsd-control] { forced-color-adjust: auto; background: ButtonFace; color: ButtonText; border-color: ButtonText; }\n  [data-tsd-selected=\"true\"] { background: Highlight; color: HighlightText; border-color: HighlightText; }\n  [data-tsd-separator] { border-color: CanvasText; }\n  [data-tsd-separator=\"resize\"] { border: 1px solid CanvasText; }\n  [data-tsd-control]:focus-visible { outline: 2px solid ButtonText; outline-offset: 2px; }\n}";
export declare const devtoolsFontCss: string;
export declare function ensureDevtoolsFonts(targetDocument: Document): void;
export declare function ensureDevtoolsStyles(targetDocument: Document): void;
export type StatusRole = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type DeepReadonly<T> = T extends (...args: Array<never>) => unknown ? T : T extends object ? {
    readonly [Key in keyof T]: DeepReadonly<T[Key]>;
} : T;
export type SemanticTheme = DeepReadonly<{
    font: {
        display: string;
        body: string;
        mono: string;
    };
    space: {
        1: '4px';
        2: '8px';
        3: '12px';
        4: '16px';
    };
    gap: {
        tight: '4px';
        control: '8px';
        section: '12px';
        sectionLarge: '16px';
    };
    padding: {
        controlBlock: '6px';
        controlInline: '8px';
    };
    type: {
        bodyXs: {
            size: '12px';
            lineHeight: '17px';
            weight: 400;
        };
        bodySm: {
            size: '14px';
            lineHeight: '20px';
            weight: 400;
        };
        bodyMd: {
            size: '16px';
            lineHeight: '24px';
            weight: 300;
        };
        labelSm: {
            size: '12px';
            lineHeight: '14px';
            weight: 500;
            tracking: '0.5px';
        };
        headingCompact: {
            size: '14px';
            lineHeight: '18px';
            weight: 700;
        };
        headingPane: {
            size: '16px';
            lineHeight: '21px';
            weight: 700;
        };
    };
    radius: {
        control: '4px';
        group: '6px';
        overlay: '8px';
    };
    shadow: {
        xs: string;
        sm: string;
        overlay: string;
    };
    motion: {
        strip: '120ms';
        graceMs: 400;
    };
    color: {
        surface: {
            app: string;
            workspace: string;
            subtle: string;
            elevated: string;
            brand: string;
        };
        text: {
            primary: string;
            secondary: string;
            muted: string;
            mutedOnBrand: string;
            inverse: string;
            link: string;
        };
        border: {
            decorative: string;
            control: string;
            focus: string;
        };
        state: {
            hover: string;
            pressed: string;
            selectionFill: string;
            selectionText: string;
        };
        status: Record<StatusRole, {
            subtleFill: string;
            border: string;
            text: string;
            solidFill: string;
            onFill: string;
        }>;
        syntax: {
            keyword: string;
            string: string;
            number: string;
            comment: string;
            property: string;
            punctuation: string;
            selectionFill: string;
            selectionText: string;
        };
    };
}>;
export declare const semanticThemes: Readonly<{
    readonly light: {
        readonly color: {
            readonly surface: {
                readonly app: "#ffffff";
                readonly workspace: "#ffffff";
                readonly subtle: "#fafafa";
                readonly elevated: "#ffffff";
                readonly brand: "#eeebd4";
            };
            readonly text: {
                readonly primary: "#111111";
                readonly secondary: "#3e3529";
                readonly muted: "#756c5b";
                readonly mutedOnBrand: "#3e3529";
                readonly inverse: "#ffffff";
                readonly link: "#003e53";
            };
            readonly border: {
                readonly decorative: "#eeebd4";
                readonly control: "#756c5b";
                readonly focus: "#003e53";
            };
            readonly state: {
                readonly hover: "#1111110f";
                readonly pressed: "#1111111f";
                readonly selectionFill: "#3e3529";
                readonly selectionText: "#ffffff";
            };
            readonly status: {
                readonly success: {
                    readonly subtleFill: "#d8f0da";
                    readonly border: "#1d4226";
                    readonly text: "#1d4226";
                    readonly solidFill: "#1d4226";
                    readonly onFill: "#ffffff";
                };
                readonly warning: {
                    readonly subtleFill: "#fef6cc";
                    readonly border: "#624a00";
                    readonly text: "#624a00";
                    readonly solidFill: "#624a00";
                    readonly onFill: "#ffffff";
                };
                readonly error: {
                    readonly subtleFill: "#f9d8c4";
                    readonly border: "#5f1a06";
                    readonly text: "#5f1a06";
                    readonly solidFill: "#5f1a06";
                    readonly onFill: "#ffffff";
                };
                readonly info: {
                    readonly subtleFill: "#d8f0f3";
                    readonly border: "#003e53";
                    readonly text: "#003e53";
                    readonly solidFill: "#003e53";
                    readonly onFill: "#ffffff";
                };
                readonly neutral: {
                    readonly subtleFill: "#eeebd4";
                    readonly border: "#756c5b";
                    readonly text: "#3e3529";
                    readonly solidFill: "#3e3529";
                    readonly onFill: "#ffffff";
                };
            };
            readonly syntax: {
                readonly keyword: "#5f1a06";
                readonly string: "#1d4226";
                readonly number: "#541f5d";
                readonly comment: "#756c5b";
                readonly property: "#003e53";
                readonly punctuation: "#3e3529";
                readonly selectionFill: "#d8f0f3";
                readonly selectionText: "#003e53";
            };
        };
        readonly font: {
            display: string;
            body: string;
            mono: string;
        };
        readonly space: {
            1: "4px";
            2: "8px";
            3: "12px";
            4: "16px";
        };
        readonly gap: {
            tight: "4px";
            control: "8px";
            section: "12px";
            sectionLarge: "16px";
        };
        readonly padding: {
            controlBlock: "6px";
            controlInline: "8px";
        };
        readonly type: {
            bodyXs: {
                size: "12px";
                lineHeight: "17px";
                weight: 400;
            };
            bodySm: {
                size: "14px";
                lineHeight: "20px";
                weight: 400;
            };
            bodyMd: {
                size: "16px";
                lineHeight: "24px";
                weight: 300;
            };
            labelSm: {
                size: "12px";
                lineHeight: "14px";
                weight: 500;
                tracking: "0.5px";
            };
            headingCompact: {
                size: "14px";
                lineHeight: "18px";
                weight: 700;
            };
            headingPane: {
                size: "16px";
                lineHeight: "21px";
                weight: 700;
            };
        };
        readonly radius: {
            control: "4px";
            group: "6px";
            overlay: "8px";
        };
        readonly shadow: {
            xs: string;
            sm: string;
            overlay: string;
        };
        readonly motion: {
            strip: "120ms";
            graceMs: 400;
        };
    };
    readonly dark: {
        readonly color: {
            readonly surface: {
                readonly app: "#111111";
                readonly workspace: "#1f1f1f";
                readonly subtle: "#1b1b1b";
                readonly elevated: "#2b2b2b";
                readonly brand: "#111111";
            };
            readonly text: {
                readonly primary: "#ffffff";
                readonly secondary: "#aea691";
                readonly muted: "#aea691";
                readonly mutedOnBrand: "#aea691";
                readonly inverse: "#111111";
                readonly link: "#9cd5e2";
            };
            readonly border: {
                readonly decorative: "#2d2d2d";
                readonly control: "#aea691";
                readonly focus: "#61adbf";
            };
            readonly state: {
                readonly hover: "#ffffff14";
                readonly pressed: "#ffffff1f";
                readonly selectionFill: "#c5c3bf";
                readonly selectionText: "#111111";
            };
            readonly status: {
                readonly success: {
                    readonly subtleFill: "#1d4226";
                    readonly border: "#69bc75";
                    readonly text: "#a2e1a9";
                    readonly solidFill: "#69bc75";
                    readonly onFill: "#111111";
                };
                readonly warning: {
                    readonly subtleFill: "#624a00";
                    readonly border: "#f4d648";
                    readonly text: "#fae884";
                    readonly solidFill: "#f4d648";
                    readonly onFill: "#111111";
                };
                readonly error: {
                    readonly subtleFill: "#5f1a06";
                    readonly border: "#e06e49";
                    readonly text: "#edaa8d";
                    readonly solidFill: "#e06e49";
                    readonly onFill: "#111111";
                };
                readonly info: {
                    readonly subtleFill: "#003e53";
                    readonly border: "#61adbf";
                    readonly text: "#9cd5e2";
                    readonly solidFill: "#61adbf";
                    readonly onFill: "#111111";
                };
                readonly neutral: {
                    readonly subtleFill: "#2b2b2b";
                    readonly border: "#aea691";
                    readonly text: "#c5c3bf";
                    readonly solidFill: "#c5c3bf";
                    readonly onFill: "#111111";
                };
            };
            readonly syntax: {
                readonly keyword: "#e06e49";
                readonly string: "#69bc75";
                readonly number: "#c56dcf";
                readonly comment: "#aea691";
                readonly property: "#61adbf";
                readonly punctuation: "#c5c3bf";
                readonly selectionFill: "#003e53";
                readonly selectionText: "#ffffff";
            };
        };
        readonly font: {
            display: string;
            body: string;
            mono: string;
        };
        readonly space: {
            1: "4px";
            2: "8px";
            3: "12px";
            4: "16px";
        };
        readonly gap: {
            tight: "4px";
            control: "8px";
            section: "12px";
            sectionLarge: "16px";
        };
        readonly padding: {
            controlBlock: "6px";
            controlInline: "8px";
        };
        readonly type: {
            bodyXs: {
                size: "12px";
                lineHeight: "17px";
                weight: 400;
            };
            bodySm: {
                size: "14px";
                lineHeight: "20px";
                weight: 400;
            };
            bodyMd: {
                size: "16px";
                lineHeight: "24px";
                weight: 300;
            };
            labelSm: {
                size: "12px";
                lineHeight: "14px";
                weight: 500;
                tracking: "0.5px";
            };
            headingCompact: {
                size: "14px";
                lineHeight: "18px";
                weight: 700;
            };
            headingPane: {
                size: "16px";
                lineHeight: "21px";
                weight: 700;
            };
        };
        readonly radius: {
            control: "4px";
            group: "6px";
            overlay: "8px";
        };
        readonly shadow: {
            xs: string;
            sm: string;
            overlay: string;
        };
        readonly motion: {
            strip: "120ms";
            graceMs: 400;
        };
    };
}>;
export declare function resolveSemanticTheme(theme: TanStackDevtoolsTheme): SemanticTheme;
export {};
