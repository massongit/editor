import { browser } from "webextension-polyfill-ts";
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import * as Comlink from "comlink";
import { createTextlintWorker, TextlintWorker } from "./background/textlint";
import { openDatabase } from "./background/database";
import { LintEngineAPI } from "textchecker-element";
import { TextlintResult } from "@textlint/types";

browser.runtime.onInstalled.addListener((details) => {
    console.log("previousVersion", details.previousVersion);
});

browser.tabs.onUpdated.addListener(async (tabId) => {
    browser.pageAction.show(tabId);
});

const gContentTypeRe = (() => {
    const userScriptTypes = [
        "text/plain",
        "application/ecmascript",
        "application/javascript",
        "application/x-javascript",
        "text/ecmascript",
        "text/javascript"
    ];
    return new RegExp(`^(${userScriptTypes.join("|")})\\b`);
})();

function responseHasUserScriptType(responseHeaders: any) {
    for (let header of responseHeaders) {
        let headerName = header.name.toLowerCase();
        if ("content-type" === headerName && gContentTypeRe.test(header.value)) {
            return true;
        }
    }
    return false;
}

async function openInstallDialog(url: string) {
    const installUrl = browser.runtime.getURL("/pages/install-dialog.html") + "?script=" + encodeURIComponent(url);
    const options = {
        height: 800,
        type: "popup",
        url: installUrl,
        width: 800
    } as const;
    await browser.windows.create(options);
}

browser.webRequest.onHeadersReceived.addListener(
    (details) => {
        console.log("details", details);
        if (details.method != "GET") return {};
        if (!responseHasUserScriptType(details.responseHeaders)) return {};

        openInstallDialog(details.url);
        // https://stackoverflow.com/a/18684302
        return { redirectUrl: "javascript:" };
    },
    { urls: ["*://*/*textlint.js"], types: ["main_frame"] },
    ["blocking", "responseHeaders"]
);
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

type DataBase = ThenArg<ReturnType<typeof openDatabase>>;
export type backgroundExposedObject = {
    addScript: DataBase["addScript"];
} & LintEngineAPI;
export type backgroundPopupObject = {
    findScriptsWithPatten: DataBase["findScriptsWithPatten"];
    findScriptsWithName: DataBase["findScriptsWithName"];
    deleteScript: DataBase["deleteScript"];
    updateScript: DataBase["updateScript"];
    openEditor: (options: { name: string; namespace: string }) => void;
};
const workerMap = new Map<TextlintWorker, Set<string>>();
const addWorker = (url: string, worker: TextlintWorker) => {
    const set = workerMap.get(worker) ?? new Set<string>();
    set.add(url);
    workerMap.set(worker, set);
};
const removeWorker = (url: string) => {
    for (const [worker, urlSet] of workerMap.entries()) {
        if (urlSet.has(url)) {
            urlSet.delete(url);
        }
        if (urlSet.size === 0) {
            worker.dispose();
            workerMap.delete(worker);
        }
    }
};
browser.runtime.onConnect.addListener(async (port) => {
    if (isMessagePort(port)) {
        return;
    }
    const db = await openDatabase();
    const originUrl = port.sender?.url;
    console.log("[background] originUrl", originUrl);
    if (!originUrl) {
        return;
    }
    if (/^(moz|chrome)-extension:\/\/.*\/(edit-script.html|popup.html)/.test(originUrl)) {
        const exports: backgroundPopupObject = {
            findScriptsWithPatten: db.findScriptsWithPatten,
            findScriptsWithName: db.findScriptsWithName,
            deleteScript: db.deleteScript,
            updateScript: db.updateScript,
            openEditor: (options: { name: string; namespace: string }) => {
                const editPageUrl = browser.runtime.getURL("/pages/edit-script.html");
                browser.tabs.create({
                    url: `${editPageUrl}?name=${encodeURIComponent(options.name)}&namespace=${encodeURIComponent(
                        options.namespace
                    )}`
                });
            }
        };
        return Comlink.expose(exports, createBackgroundEndpoint(port));
    }
    const scripts = await db.findScriptsWithPatten(originUrl);
    const workers = scripts.map((script) => {
        const blob = new Blob([script.code], { type: "application/javascript" });
        // TODO: comment support for textlintrc
        const textlintWorker = createTextlintWorker(URL.createObjectURL(blob), JSON.parse(script.textlintrc));
        addWorker(originUrl, textlintWorker);
        return textlintWorker;
    });
    console.log("[Background] workers started", workers);
    // Support multiple workers
    const ext = ".md";
    const lintEngine: LintEngineAPI = {
        async lintText({ text }: { text: string }): Promise<TextlintResult[]> {
            console.log("[Background] text:", text);
            const allLintResults = await Promise.all(
                workers.map((worker) => {
                    return worker.createLintEngine({ ext }).lintText({ text });
                })
            );
            console.log("[Background]", allLintResults);
            return allLintResults.flat();
        },
        async fixText({ text }): Promise<{ output: string }> {
            let output = text;
            for (const worker of workers) {
                await worker
                    .createLintEngine({ ext })
                    .fixText({ text: output, messages: [] })
                    .then((result) => {
                        output = result.output;
                        return result;
                    });
            }
            return {
                output
            };
        },
        async ignoreText(): Promise<boolean> {
            throw new Error("No implement ignoreText on background");
        }
    };
    const backgroundExposedObject: backgroundExposedObject = {
        ...lintEngine,
        addScript: (script) => {
            return db.addScript(script);
        }
    };
    port.onDisconnect.addListener(() => {
        console.log("[Background] dispose worker");
        removeWorker(originUrl);
    });
    console.log("[Background] content port", port);
    Comlink.expose(backgroundExposedObject, createBackgroundEndpoint(port));
    await Promise.all(workers.map((worker) => worker.ready()));
    port.postMessage("textlint-editor-boot");
});
