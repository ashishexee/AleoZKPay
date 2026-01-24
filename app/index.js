import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

const TextEncodingPolyfill = require('text-encoding');
global.TextEncoder = TextEncodingPolyfill.TextEncoder;
global.TextDecoder = TextEncodingPolyfill.TextDecoder;

import { LogBox } from 'react-native';

// Enable logging from LogBox
LogBox.ignoreAllLogs(false);

// Capture global JS errors
if (__DEV__) {
    const originalHandler = global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error("Caught global error:", error);
        originalHandler(error, isFatal);
    });
}

import { registerRootComponent } from 'expo';

import App from './App';
registerRootComponent(App);
