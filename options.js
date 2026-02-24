document.addEventListener('DOMContentLoaded', async () => {
    const ui = {
        middleClick: document.getElementById('middleClick'),
                          ctrlClick: document.getElementById('ctrlClick'),
                          contextMenu: document.getElementById('contextMenu'),
                          autoRemove: document.getElementById('autoRemove'),
                          theme: document.getElementById('theme'),
                          saveBtn: document.getElementById('saveBtn'),
                          saveMsg: document.getElementById('saveMsg')
    };

    function applyTheme(themeValue) {
        if (themeValue === 'dark' || themeValue === 'light') {
            document.documentElement.setAttribute('data-theme', themeValue);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    const defaultSettings = {
        middleClick: true,
        ctrlClick: false,
        contextMenu: true,
        autoRemove: false,
        theme: 'system'
    };

    const data = await browser.storage.local.get("settings");
    const settings = data.settings || defaultSettings;

    ui.middleClick.checked = settings.middleClick;
    ui.ctrlClick.checked = settings.ctrlClick;
    ui.contextMenu.checked = settings.contextMenu;
    ui.autoRemove.checked = settings.autoRemove || false;
    ui.theme.value = settings.theme;

    applyTheme(settings.theme);

    ui.theme.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    ui.saveBtn.addEventListener('click', async () => {
        await browser.storage.local.set({
            settings: {
                middleClick: ui.middleClick.checked,
                ctrlClick: ui.ctrlClick.checked,
                contextMenu: ui.contextMenu.checked,
                autoRemove: ui.autoRemove.checked,
                theme: ui.theme.value
            }
        });

        ui.saveMsg.style.display = 'block';
        setTimeout(() => ui.saveMsg.style.display = 'none', 2500);
    });
});
