let settings = { middleClick: true, ctrlClick: false };

try {
    browser.storage.local.get("settings").then(data => {
        if (data.settings) settings = data.settings;
    });
        browser.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.settings) settings = changes.settings.newValue;
        });
} catch (e) { console.warn("Erro nas configs", e); }

function interceptClick(e) {
    const isMiddleClick = e.button === 1; 
    const isCtrlClick = e.button === 0 && (e.ctrlKey || e.metaKey);

    if ((isMiddleClick && settings.middleClick) || (isCtrlClick && settings.ctrlClick)) {
        const link = e.target.closest('a');
        if (!link || !link.href || link.href.startsWith('javascript:') || link.href.startsWith('mailto:')) return;

        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.type === 'auxclick' || e.type === 'click') {
            e.preventDefault();

            const ctxName = document.title || window.location.hostname || "Saved Links";

            try {
                let sending = browser.runtime.sendMessage({
                    action: "addLink",
                    url: link.href,
                    linkText: link.innerText.trim() || link.href,
                                                          contextName: ctxName
                });
                sending.catch(() => console.warn("Extensão recarregada, atualize a página."));
            } catch (err) {
                console.warn("Erro ao enviar link.", err);
            }
        }
    }
}

window.addEventListener('mousedown', interceptClick, true);
window.addEventListener('click', interceptClick, true);
window.addEventListener('auxclick', interceptClick, true);
