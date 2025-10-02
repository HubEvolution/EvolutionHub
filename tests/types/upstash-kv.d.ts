declare module 'upstash/kv' {
  export class Redis {
    constructor(...args: any[]);
    get(key: string): Promise<string | null>;
    set(key: string, value: any, opts?: any): Promise<any>;
    del(key: string): Promise<any>;
  }
}
