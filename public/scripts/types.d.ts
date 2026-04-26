interface Element {
    value?: string;
    options?: Array;
    files?: Array;
}

interface Configuration {
    [r: string]: string;
    [n: string]: string;
}

interface EventTarget {
    classList?: DOMTokenList;
    value?: string;
}

interface Statistics {
    possible?: number;
    time?: number;
    number?: number;
}