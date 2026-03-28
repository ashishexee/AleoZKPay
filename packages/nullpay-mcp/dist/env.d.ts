export declare const DEFAULT_BACKEND_URL = "https://nullpay-backend-ib5q4.ondigitalocean.app/api";
export declare const DEFAULT_PUBLIC_BASE_URL = "https://nullpay.app";
export declare function parseDotEnv(content: string): Record<string, string>;
export declare function loadEnvFiles(): void;
export declare function getRuntimeConfig(): {
    backendBaseUrl: string;
    publicBaseUrl: string;
};
export declare function getProvableConfig(): {
    apiKey: string;
    consumerId: string;
};
