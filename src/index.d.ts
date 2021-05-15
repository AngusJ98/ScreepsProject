declare global {
    module NodeJS {
        interface Global {
            Empire: any;
            config: any;
        }
    }
}

declare var Empire;
