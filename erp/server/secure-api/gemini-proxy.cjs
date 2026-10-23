"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@supabase/supabase-js/dist/index.cjs
var require_dist = __commonJS({
  "node_modules/@supabase/supabase-js/dist/index.cjs"(exports2) {
    var __supabase_functions_js = require("@supabase/functions-js");
    var __supabase_postgrest_js = require("@supabase/postgrest-js");
    var __supabase_realtime_js = require("@supabase/realtime-js");
    var __supabase_storage_js = require("@supabase/storage-js");
    var __supabase_auth_js = require("@supabase/auth-js");
    var version = "2.99.1";
    var JS_ENV = "";
    if (typeof Deno !== "undefined") JS_ENV = "deno";
    else if (typeof document !== "undefined") JS_ENV = "web";
    else if (typeof navigator !== "undefined" && navigator.product === "ReactNative") JS_ENV = "react-native";
    else JS_ENV = "node";
    var DEFAULT_HEADERS = { "X-Client-Info": `supabase-js-${JS_ENV}/${version}` };
    var DEFAULT_GLOBAL_OPTIONS = { headers: DEFAULT_HEADERS };
    var DEFAULT_DB_OPTIONS = { schema: "public" };
    var DEFAULT_AUTH_OPTIONS = {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "implicit"
    };
    var DEFAULT_REALTIME_OPTIONS = {};
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o$1) {
        return typeof o$1;
      } : function(o$1) {
        return o$1 && "function" == typeof Symbol && o$1.constructor === Symbol && o$1 !== Symbol.prototype ? "symbol" : typeof o$1;
      }, _typeof(o);
    }
    function toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    function toPropertyKey(t) {
      var i = toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    function _defineProperty(e, r, t) {
      return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
        value: t,
        enumerable: true,
        configurable: true,
        writable: true
      }) : e[r] = t, e;
    }
    function ownKeys(e, r) {
      var t = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter(function(r$1) {
          return Object.getOwnPropertyDescriptor(e, r$1).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread2(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r$1) {
          _defineProperty(e, r$1, t[r$1]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r$1) {
          Object.defineProperty(e, r$1, Object.getOwnPropertyDescriptor(t, r$1));
        });
      }
      return e;
    }
    var resolveFetch = (customFetch) => {
      if (customFetch) return (...args) => customFetch(...args);
      return (...args) => fetch(...args);
    };
    var resolveHeadersConstructor = () => {
      return Headers;
    };
    var fetchWithAuth = (supabaseKey, getAccessToken, customFetch) => {
      const fetch$1 = resolveFetch(customFetch);
      const HeadersConstructor = resolveHeadersConstructor();
      return async (input, init) => {
        var _await$getAccessToken;
        const accessToken = (_await$getAccessToken = await getAccessToken()) !== null && _await$getAccessToken !== void 0 ? _await$getAccessToken : supabaseKey;
        let headers = new HeadersConstructor(init === null || init === void 0 ? void 0 : init.headers);
        if (!headers.has("apikey")) headers.set("apikey", supabaseKey);
        if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch$1(input, _objectSpread2(_objectSpread2({}, init), {}, { headers }));
      };
    };
    function ensureTrailingSlash(url) {
      return url.endsWith("/") ? url : url + "/";
    }
    function applySettingDefaults(options, defaults) {
      var _DEFAULT_GLOBAL_OPTIO, _globalOptions$header;
      const { db: dbOptions, auth: authOptions, realtime: realtimeOptions, global: globalOptions } = options;
      const { db: DEFAULT_DB_OPTIONS$1, auth: DEFAULT_AUTH_OPTIONS$1, realtime: DEFAULT_REALTIME_OPTIONS$1, global: DEFAULT_GLOBAL_OPTIONS$1 } = defaults;
      const result = {
        db: _objectSpread2(_objectSpread2({}, DEFAULT_DB_OPTIONS$1), dbOptions),
        auth: _objectSpread2(_objectSpread2({}, DEFAULT_AUTH_OPTIONS$1), authOptions),
        realtime: _objectSpread2(_objectSpread2({}, DEFAULT_REALTIME_OPTIONS$1), realtimeOptions),
        storage: {},
        global: _objectSpread2(_objectSpread2(_objectSpread2({}, DEFAULT_GLOBAL_OPTIONS$1), globalOptions), {}, { headers: _objectSpread2(_objectSpread2({}, (_DEFAULT_GLOBAL_OPTIO = DEFAULT_GLOBAL_OPTIONS$1 === null || DEFAULT_GLOBAL_OPTIONS$1 === void 0 ? void 0 : DEFAULT_GLOBAL_OPTIONS$1.headers) !== null && _DEFAULT_GLOBAL_OPTIO !== void 0 ? _DEFAULT_GLOBAL_OPTIO : {}), (_globalOptions$header = globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.headers) !== null && _globalOptions$header !== void 0 ? _globalOptions$header : {}) }),
        accessToken: async () => ""
      };
      if (options.accessToken) result.accessToken = options.accessToken;
      else delete result.accessToken;
      return result;
    }
    function validateSupabaseUrl(supabaseUrl) {
      const trimmedUrl = supabaseUrl === null || supabaseUrl === void 0 ? void 0 : supabaseUrl.trim();
      if (!trimmedUrl) throw new Error("supabaseUrl is required.");
      if (!trimmedUrl.match(/^https?:\/\//i)) throw new Error("Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.");
      try {
        return new URL(ensureTrailingSlash(trimmedUrl));
      } catch (_unused) {
        throw Error("Invalid supabaseUrl: Provided URL is malformed.");
      }
    }
    var SupabaseAuthClient = class extends __supabase_auth_js.AuthClient {
      constructor(options) {
        super(options);
      }
    };
    var SupabaseClient = class {
      /**
      * Create a new client for use in the browser.
      *
      * @category Initializing
      *
      * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.
      * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.
      * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.
      * @param options.auth.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
      * @param options.auth.persistSession Set to "true" if you want to automatically save the user session into local storage.
      * @param options.auth.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
      * @param options.realtime Options passed along to realtime-js constructor.
      * @param options.storage Options passed along to the storage-js constructor.
      * @param options.global.fetch A custom fetch implementation.
      * @param options.global.headers Any additional headers to send with each network request.
      *
      * @example Creating a client
      * ```js
      * import { createClient } from '@supabase/supabase-js'
      *
      * // Create a single supabase client for interacting with your database
      * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')
      * ```
      *
      * @example With a custom domain
      * ```js
      * import { createClient } from '@supabase/supabase-js'
      *
      * // Use a custom domain as the supabase URL
      * const supabase = createClient('https://my-custom-domain.com', 'publishable-or-anon-key')
      * ```
      *
      * @example With additional parameters
      * ```js
      * import { createClient } from '@supabase/supabase-js'
      *
      * const options = {
      *   db: {
      *     schema: 'public',
      *   },
      *   auth: {
      *     autoRefreshToken: true,
      *     persistSession: true,
      *     detectSessionInUrl: true
      *   },
      *   global: {
      *     headers: { 'x-my-custom-header': 'my-app-name' },
      *   },
      * }
      * const supabase = createClient("https://xyzcompany.supabase.co", "publishable-or-anon-key", options)
      * ```
      *
      * @exampleDescription With custom schemas
      * By default the API server points to the `public` schema. You can enable other database schemas within the Dashboard.
      * Go to [Settings > API > Exposed schemas](/dashboard/project/_/settings/api) and add the schema which you want to expose to the API.
      *
      * Note: each client connection can only access a single schema, so the code above can access the `other_schema` schema but cannot access the `public` schema.
      *
      * @example With custom schemas
      * ```js
      * import { createClient } from '@supabase/supabase-js'
      *
      * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {
      *   // Provide a custom schema. Defaults to "public".
      *   db: { schema: 'other_schema' }
      * })
      * ```
      *
      * @exampleDescription Custom fetch implementation
      * `supabase-js` uses the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) library to make HTTP requests,
      * but an alternative `fetch` implementation can be provided as an option.
      * This is most useful in environments where `cross-fetch` is not compatible (for instance Cloudflare Workers).
      *
      * @example Custom fetch implementation
      * ```js
      * import { createClient } from '@supabase/supabase-js'
      *
      * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {
      *   global: { fetch: fetch.bind(globalThis) }
      * })
      * ```
      *
      * @exampleDescription React Native options with AsyncStorage
      * For React Native we recommend using `AsyncStorage` as the storage implementation for Supabase Auth.
      *
      * @example React Native options with AsyncStorage
      * ```js
      * import 'react-native-url-polyfill/auto'
      * import { createClient } from '@supabase/supabase-js'
      * import AsyncStorage from "@react-native-async-storage/async-storage";
      *
      * const supabase = createClient("https://xyzcompany.supabase.co", "publishable-or-anon-key", {
      *   auth: {
      *     storage: AsyncStorage,
      *     autoRefreshToken: true,
      *     persistSession: true,
      *     detectSessionInUrl: false,
      *   },
      * });
      * ```
      *
      * @exampleDescription React Native options with Expo SecureStore
      * If you wish to encrypt the user's session information, you can use `aes-js` and store the encryption key in Expo SecureStore.
      * The `aes-js` library, a reputable JavaScript-only implementation of the AES encryption algorithm in CTR mode.
      * A new 256-bit encryption key is generated using the `react-native-get-random-values` library.
      * This key is stored inside Expo's SecureStore, while the value is encrypted and placed inside AsyncStorage.
      *
      * Please make sure that:
      * - You keep the `expo-secure-store`, `aes-js` and `react-native-get-random-values` libraries up-to-date.
      * - Choose the correct [`SecureStoreOptions`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestoreoptions) for your app's needs.
      *   E.g. [`SecureStore.WHEN_UNLOCKED`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestorewhen_unlocked) regulates when the data can be accessed.
      * - Carefully consider optimizations or other modifications to the above example, as those can lead to introducing subtle security vulnerabilities.
      *
      * @example React Native options with Expo SecureStore
      * ```ts
      * import 'react-native-url-polyfill/auto'
      * import { createClient } from '@supabase/supabase-js'
      * import AsyncStorage from '@react-native-async-storage/async-storage';
      * import * as SecureStore from 'expo-secure-store';
      * import * as aesjs from 'aes-js';
      * import 'react-native-get-random-values';
      *
      * // As Expo's SecureStore does not support values larger than 2048
      * // bytes, an AES-256 key is generated and stored in SecureStore, while
      * // it is used to encrypt/decrypt values stored in AsyncStorage.
      * class LargeSecureStore {
      *   private async _encrypt(key: string, value: string) {
      *     const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
      *
      *     const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
      *     const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
      *
      *     await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
      *
      *     return aesjs.utils.hex.fromBytes(encryptedBytes);
      *   }
      *
      *   private async _decrypt(key: string, value: string) {
      *     const encryptionKeyHex = await SecureStore.getItemAsync(key);
      *     if (!encryptionKeyHex) {
      *       return encryptionKeyHex;
      *     }
      *
      *     const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
      *     const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
      *
      *     return aesjs.utils.utf8.fromBytes(decryptedBytes);
      *   }
      *
      *   async getItem(key: string) {
      *     const encrypted = await AsyncStorage.getItem(key);
      *     if (!encrypted) { return encrypted; }
      *
      *     return await this._decrypt(key, encrypted);
      *   }
      *
      *   async removeItem(key: string) {
      *     await AsyncStorage.removeItem(key);
      *     await SecureStore.deleteItemAsync(key);
      *   }
      *
      *   async setItem(key: string, value: string) {
      *     const encrypted = await this._encrypt(key, value);
      *
      *     await AsyncStorage.setItem(key, encrypted);
      *   }
      * }
      *
      * const supabase = createClient("https://xyzcompany.supabase.co", "publishable-or-anon-key", {
      *   auth: {
      *     storage: new LargeSecureStore(),
      *     autoRefreshToken: true,
      *     persistSession: true,
      *     detectSessionInUrl: false,
      *   },
      * });
      * ```
      *
      * @example With a database query
      * ```ts
      * import { createClient } from '@supabase/supabase-js'
      *
      * const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key')
      *
      * const { data } = await supabase.from('profiles').select('*')
      * ```
      */
      constructor(supabaseUrl, supabaseKey, options) {
        var _settings$auth$storag, _settings$global$head;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        const baseUrl = validateSupabaseUrl(supabaseUrl);
        if (!supabaseKey) throw new Error("supabaseKey is required.");
        this.realtimeUrl = new URL("realtime/v1", baseUrl);
        this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace("http", "ws");
        this.authUrl = new URL("auth/v1", baseUrl);
        this.storageUrl = new URL("storage/v1", baseUrl);
        this.functionsUrl = new URL("functions/v1", baseUrl);
        const defaultStorageKey = `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
        const DEFAULTS = {
          db: DEFAULT_DB_OPTIONS,
          realtime: DEFAULT_REALTIME_OPTIONS,
          auth: _objectSpread2(_objectSpread2({}, DEFAULT_AUTH_OPTIONS), {}, { storageKey: defaultStorageKey }),
          global: DEFAULT_GLOBAL_OPTIONS
        };
        const settings = applySettingDefaults(options !== null && options !== void 0 ? options : {}, DEFAULTS);
        this.storageKey = (_settings$auth$storag = settings.auth.storageKey) !== null && _settings$auth$storag !== void 0 ? _settings$auth$storag : "";
        this.headers = (_settings$global$head = settings.global.headers) !== null && _settings$global$head !== void 0 ? _settings$global$head : {};
        if (!settings.accessToken) {
          var _settings$auth;
          this.auth = this._initSupabaseAuthClient((_settings$auth = settings.auth) !== null && _settings$auth !== void 0 ? _settings$auth : {}, this.headers, settings.global.fetch);
        } else {
          this.accessToken = settings.accessToken;
          this.auth = new Proxy({}, { get: (_, prop) => {
            throw new Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(prop)} is not possible`);
          } });
        }
        this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch);
        this.realtime = this._initRealtimeClient(_objectSpread2({
          headers: this.headers,
          accessToken: this._getAccessToken.bind(this)
        }, settings.realtime));
        if (this.accessToken) Promise.resolve(this.accessToken()).then((token) => this.realtime.setAuth(token)).catch((e) => console.warn("Failed to set initial Realtime auth token:", e));
        this.rest = new __supabase_postgrest_js.PostgrestClient(new URL("rest/v1", baseUrl).href, {
          headers: this.headers,
          schema: settings.db.schema,
          fetch: this.fetch,
          timeout: settings.db.timeout,
          urlLengthLimit: settings.db.urlLengthLimit
        });
        this.storage = new __supabase_storage_js.StorageClient(this.storageUrl.href, this.headers, this.fetch, options === null || options === void 0 ? void 0 : options.storage);
        if (!settings.accessToken) this._listenForAuthEvents();
      }
      /**
      * Supabase Functions allows you to deploy and invoke edge functions.
      */
      get functions() {
        return new __supabase_functions_js.FunctionsClient(this.functionsUrl.href, {
          headers: this.headers,
          customFetch: this.fetch
        });
      }
      /**
      * Perform a query on a table or a view.
      *
      * @param relation - The table or view name to query
      */
      from(relation) {
        return this.rest.from(relation);
      }
      /**
      * Select a schema to query or perform an function (rpc) call.
      *
      * The schema needs to be on the list of exposed schemas inside Supabase.
      *
      * @param schema - The schema to query
      */
      schema(schema) {
        return this.rest.schema(schema);
      }
      /**
      * Perform a function call.
      *
      * @param fn - The function name to call
      * @param args - The arguments to pass to the function call
      * @param options - Named parameters
      * @param options.head - When set to `true`, `data` will not be returned.
      * Useful if you only need the count.
      * @param options.get - When set to `true`, the function will be called with
      * read-only access mode.
      * @param options.count - Count algorithm to use to count rows returned by the
      * function. Only applicable for [set-returning
      * functions](https://www.postgresql.org/docs/current/functions-srf.html).
      *
      * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
      * hood.
      *
      * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
      * statistics under the hood.
      *
      * `"estimated"`: Uses exact count for low numbers and planned count for high
      * numbers.
      */
      rpc(fn, args = {}, options = {
        head: false,
        get: false,
        count: void 0
      }) {
        return this.rest.rpc(fn, args, options);
      }
      /**
      * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.
      *
      * @param {string} name - The name of the Realtime channel.
      * @param {Object} opts - The options to pass to the Realtime channel.
      *
      */
      channel(name, opts = { config: {} }) {
        return this.realtime.channel(name, opts);
      }
      /**
      * Returns all Realtime channels.
      */
      getChannels() {
        return this.realtime.getChannels();
      }
      /**
      * Unsubscribes and removes Realtime channel from Realtime client.
      *
      * @param {RealtimeChannel} channel - The name of the Realtime channel.
      *
      */
      removeChannel(channel) {
        return this.realtime.removeChannel(channel);
      }
      /**
      * Unsubscribes and removes all Realtime channels from Realtime client.
      */
      removeAllChannels() {
        return this.realtime.removeAllChannels();
      }
      async _getAccessToken() {
        var _this = this;
        var _data$session$access_, _data$session;
        if (_this.accessToken) return await _this.accessToken();
        const { data } = await _this.auth.getSession();
        return (_data$session$access_ = (_data$session = data.session) === null || _data$session === void 0 ? void 0 : _data$session.access_token) !== null && _data$session$access_ !== void 0 ? _data$session$access_ : _this.supabaseKey;
      }
      _initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, storage, userStorage, storageKey, flowType, lock, debug, throwOnError }, headers, fetch$1) {
        const authHeaders = {
          Authorization: `Bearer ${this.supabaseKey}`,
          apikey: `${this.supabaseKey}`
        };
        return new SupabaseAuthClient({
          url: this.authUrl.href,
          headers: _objectSpread2(_objectSpread2({}, authHeaders), headers),
          storageKey,
          autoRefreshToken,
          persistSession,
          detectSessionInUrl,
          storage,
          userStorage,
          flowType,
          lock,
          debug,
          throwOnError,
          fetch: fetch$1,
          hasCustomAuthorizationHeader: Object.keys(this.headers).some((key) => key.toLowerCase() === "authorization")
        });
      }
      _initRealtimeClient(options) {
        return new __supabase_realtime_js.RealtimeClient(this.realtimeUrl.href, _objectSpread2(_objectSpread2({}, options), {}, { params: _objectSpread2(_objectSpread2({}, { apikey: this.supabaseKey }), options === null || options === void 0 ? void 0 : options.params) }));
      }
      _listenForAuthEvents() {
        return this.auth.onAuthStateChange((event, session) => {
          this._handleTokenChanged(event, "CLIENT", session === null || session === void 0 ? void 0 : session.access_token);
        });
      }
      _handleTokenChanged(event, source, token) {
        if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && this.changedAccessToken !== token) {
          this.changedAccessToken = token;
          this.realtime.setAuth(token);
        } else if (event === "SIGNED_OUT") {
          this.realtime.setAuth();
          if (source == "STORAGE") this.auth.signOut();
          this.changedAccessToken = void 0;
        }
      }
    };
    var createClient2 = (supabaseUrl, supabaseKey, options) => {
      return new SupabaseClient(supabaseUrl, supabaseKey, options);
    };
    function shouldShowDeprecationWarning() {
      if (typeof window !== "undefined") return false;
      const _process = globalThis["process"];
      if (!_process) return false;
      const processVersion = _process["version"];
      if (processVersion === void 0 || processVersion === null) return false;
      const versionMatch = processVersion.match(/^v(\d+)\./);
      if (!versionMatch) return false;
      return parseInt(versionMatch[1], 10) <= 18;
    }
    if (shouldShowDeprecationWarning()) console.warn("\u26A0\uFE0F  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217");
    Object.defineProperty(exports2, "FunctionRegion", {
      enumerable: true,
      get: function() {
        return __supabase_functions_js.FunctionRegion;
      }
    });
    Object.defineProperty(exports2, "FunctionsError", {
      enumerable: true,
      get: function() {
        return __supabase_functions_js.FunctionsError;
      }
    });
    Object.defineProperty(exports2, "FunctionsFetchError", {
      enumerable: true,
      get: function() {
        return __supabase_functions_js.FunctionsFetchError;
      }
    });
    Object.defineProperty(exports2, "FunctionsHttpError", {
      enumerable: true,
      get: function() {
        return __supabase_functions_js.FunctionsHttpError;
      }
    });
    Object.defineProperty(exports2, "FunctionsRelayError", {
      enumerable: true,
      get: function() {
        return __supabase_functions_js.FunctionsRelayError;
      }
    });
    Object.defineProperty(exports2, "PostgrestError", {
      enumerable: true,
      get: function() {
        return __supabase_postgrest_js.PostgrestError;
      }
    });
    exports2.SupabaseClient = SupabaseClient;
    exports2.createClient = createClient2;
    Object.keys(__supabase_auth_js).forEach(function(k) {
      if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports2, k)) Object.defineProperty(exports2, k, {
        enumerable: true,
        get: function() {
          return __supabase_auth_js[k];
        }
      });
    });
    Object.keys(__supabase_realtime_js).forEach(function(k) {
      if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports2, k)) Object.defineProperty(exports2, k, {
        enumerable: true,
        get: function() {
          return __supabase_realtime_js[k];
        }
      });
    });
  }
});

// api/gemini-proxy.ts
var gemini_proxy_exports = {};
__export(gemini_proxy_exports, {
  default: () => handler
});
module.exports = __toCommonJS(gemini_proxy_exports);

// api/_lib/authenticatedErpRequest.ts
var import_supabase_js = __toESM(require_dist(), 1);
function getBearerToken(req) {
  const header = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  return /^Bearer\s+(\S+)$/i.exec(String(header || ""))?.[1] || "";
}
async function authenticateErpRequest(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Sess\xE3o inv\xE1lida. Entre novamente." });
    return null;
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) {
    res.status(503).json({ error: "Servi\xE7o indispon\xEDvel no servidor." });
    return null;
  }
  const userDb = (0, import_supabase_js.createClient)(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: auth, error: authError } = await userDb.auth.getUser(token);
  if (authError || !auth.user?.id) {
    res.status(401).json({ error: "Sess\xE3o inv\xE1lida. Entre novamente." });
    return null;
  }
  const { data: profile, error: profileError } = await userDb.from("profiles").select("role,roles").eq("id", auth.user.id).maybeSingle();
  if (profileError) {
    res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar o perfil." });
    return null;
  }
  const roles = [
    ...Array.isArray(profile?.roles) ? profile.roles : [],
    ...typeof profile?.role === "string" ? [profile.role] : []
  ].filter((role) => typeof role === "string" && role.trim().length > 0);
  if (!roles.length || roles.includes("pending")) {
    res.status(403).json({ error: "Perfil sem acesso ao servi\xE7o." });
    return null;
  }
  const { data: settings, error: settingsError } = await userDb.from("settings").select("data->rolePermissions").eq("id", "app").maybeSingle();
  if (settingsError) {
    res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar as permiss\xF5es." });
    return null;
  }
  return {
    userId: auth.user.id,
    roles,
    userDb,
    rolePermissions: settings?.rolePermissions || {}
  };
}

// api/gemini-proxy.ts
var MAX_REQUEST_BYTES = 1e6;
var MODEL_PATTERN = /^gemini-[a-z0-9][a-z0-9.-]{0,100}$/i;
var ALLOWED_FIELDS = /* @__PURE__ */ new Set(["content", "contents", "generationConfig", "tools", "toolConfig", "systemInstruction"]);
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "M\xE9todo n\xE3o permitido." });
  if (!process.env.GEMINI_API_KEY?.trim()) return res.status(503).json({ error: "IA indispon\xEDvel no servidor." });
  if (Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8") > MAX_REQUEST_BYTES) {
    return res.status(413).json({ error: "Solicita\xE7\xE3o excede o tamanho permitido." });
  }
  const context = await authenticateErpRequest(req, res);
  if (!context) return;
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Solicita\xE7\xE3o inv\xE1lida." });
  }
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const action = body.action;
  const payload = body.payload;
  if (!MODEL_PATTERN.test(model) || !["generateContent", "embedContent"].includes(action)) {
    return res.status(400).json({ error: "Modelo ou opera\xE7\xE3o de IA n\xE3o permitido." });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "Conte\xFAdo de IA inv\xE1lido." });
  }
  const unsupportedField = Object.keys(payload).find((key) => !ALLOWED_FIELDS.has(key));
  if (unsupportedField) return res.status(400).json({ error: "Campo de IA n\xE3o permitido." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45e3);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${action}?key=${encodeURIComponent(process.env.GEMINI_API_KEY.trim())}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      }
    );
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch {
    return res.status(controller.signal.aborted ? 504 : 502).json({ error: "N\xE3o foi poss\xEDvel consultar o servi\xE7o de IA." });
  } finally {
    clearTimeout(timeout);
  }
}
