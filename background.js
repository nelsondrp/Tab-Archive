function saveLink(url, title, contextName) {
    browser.storage.local.get("contexts").then((data) => {
        let contexts = data.contexts || {};

        if (!contexts[contextName]) {
            contexts[contextName] = [];
        }

        const existingIndex = contexts[contextName].findIndex(item => item.url === url);
        if (existingIndex !== -1) {
            contexts[contextName].splice(existingIndex, 1);
        }

        contexts[contextName].push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                   url: url,
                                   title: title || url
        });

        browser.storage.local.set({ contexts }).then(() => {
            browser.action.setBadgeText({ text: "✓" });
            browser.action.setBadgeBackgroundColor({ color: "#0f9d58" });

            setTimeout(() => {
                browser.action.setBadgeText({ text: "" });
            }, 400);
        });
    }).catch(err => console.error("Erro ao salvar link:", err));
}

async function updateContextMenu() {
    const data = await browser.storage.local.get("settings");
    const settings = data.settings || { contextMenu: true };

    await browser.menus.removeAll();

    if (settings.contextMenu) {
        browser.menus.create({
            id: "add-to-context",
            title: "Add Link to Context",
            contexts: ["link"]
        });
    }
}

browser.menus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "add-to-context") {
        saveLink(info.linkUrl, info.linkText || info.linkUrl, tab.title || "Unknown Context");
    }
});

browser.runtime.onMessage.addListener((message) => {
    if (message.action === "addLink") {
        saveLink(message.url, message.linkText, message.contextName);
    }
});

browser.runtime.onInstalled.addListener(updateContextMenu);
browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
        updateContextMenu();
    }
});
