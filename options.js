document.addEventListener('DOMContentLoaded', async () => {
    const ui = {
        middleClick: document.getElementById('middleClick'),
                          ctrlClick: document.getElementById('ctrlClick'),
                          contextMenu: document.getElementById('contextMenu'),
                          autoRemove: document.getElementById('autoRemove'), // Novo mapeamento
                          theme: document.getElementById('theme'),
                          saveBtn: document.getElementById('saveBtn'),
                          saveMsg: document.getElementById('saveMsg')
    };

    // Função para trocar o visual na hora
    function applyTheme(themeValue) {
        if (themeValue === 'dark' || themeValue === 'light') {
            document.documentElement.setAttribute('data-theme', themeValue);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    // Adicionado autoRemove aos padrões
    const defaultSettings = {
        middleClick: true,
        ctrlClick: false,
        contextMenu: true,
        autoRemove: false, // Novo padrão
        theme: 'system'
    };

    const data = await browser.storage.local.get("settings");
    const settings = data.settings || defaultSettings;

    // Carrega o estado atual para os checkboxes na tela
    ui.middleClick.checked = settings.middleClick;
    ui.ctrlClick.checked = settings.ctrlClick;
    ui.contextMenu.checked = settings.contextMenu;
    ui.autoRemove.checked = settings.autoRemove || false; // Novo carregamento
    ui.theme.value = settings.theme;

    // Aplica o tema ao carregar a página
    applyTheme(settings.theme);

    // Muda o tema em tempo real ao selecionar no dropdown (antes mesmo de salvar)
    ui.theme.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    // Salva as configurações
    ui.saveBtn.addEventListener('click', async () => {
        await browser.storage.local.set({
            settings: {
                middleClick: ui.middleClick.checked,
                ctrlClick: ui.ctrlClick.checked,
                contextMenu: ui.contextMenu.checked,
                autoRemove: ui.autoRemove.checked, // Novo salvamento
                theme: ui.theme.value
            }
        });

        ui.saveMsg.style.display = 'block';
        setTimeout(() => ui.saveMsg.style.display = 'none', 2500);
    });
});
